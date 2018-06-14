# name: civically-search-extension
# about: Adds additional functionality to Discourse search
# version: 0.1
# authors: Angus McLeod
# url: https://github.com/civicallyhq/x-civically-search

register_asset 'stylesheets/search-extension.scss'

after_initialize do
  module ::SearchExtension
    class Engine < ::Rails::Engine
      engine_name "search_extension"
      isolate_namespace SearchExtension
    end
  end

  SearchExtension::Engine.routes.draw do
    post "similar-title" => "search#similar_title"
  end

  Discourse::Application.routes.append do
    mount ::SearchExtension::Engine, at: "search_extension"
  end

  class SearchExtension::SimilarSerializer < ApplicationSerializer
    attributes :id, :title, :created_at, :url, :identical

    def identical
      object.title.downcase === @options[:compose_title].downcase
    end
  end

  require_dependency "application_controller"
  class SearchExtension::SearchController < ::ApplicationController
    def similar_title
      title = title_params[:title]

      if title.length > 3
        topics = Topic.similar_title_to(title_params.to_h, current_user).to_a
      else
        opts = {
          order: 'created',
          category: title_params[:category_id]
        }

        if title_params[:no_definitions]
          opts[:no_definitions] = true
        end

        opts[:subtype] = title_params[:subtype] if title_params[:subtype]
        opts[:petition_id] = title_params[:petition_id] if title_params[:petition_id]

        topics = TopicQuery.new(nil, opts).list_similar.topics
      end

      render_serialized(topics, SearchExtension::SimilarSerializer, compose_title: title)
    end

    def title_params
      params.permit(:title, :category_id, :subtype, :petition_id, :no_definitions, :similarity)
    end
  end

  require_dependency 'search'
  require_dependency 'topic'
  class ::Topic
    def self.similar_title_to(opts, user = nil)
      filter_words = Search.prepare_data(opts[:title]);
      ts_query = Search.ts_query(term: filter_words, joiner: "|")

      candidates = Topic.visible
        .secured(Guardian.new(user))
        .listable_topics
        .joins('JOIN topic_search_data s ON topics.id = s.topic_id')
        .where("search_data @@ #{ts_query}")
        .order("ts_rank(search_data, #{ts_query}) DESC")
        .limit(SiteSetting.max_similar_results * 3)

      exclude_topic_ids = Category.pluck(:topic_id).compact!
      if exclude_topic_ids.present?
        candidates = candidates.where("topics.id NOT IN (?)", exclude_topic_ids)
      end

      if opts[:category_id].present?
        candidates = candidates.where("topics.category_id = ?", opts[:category_id])
      end

      if opts[:subtype].present?
        candidates = candidates.where("topics.subtype = ?", opts[:subtype])
      end

      if opts[:petition_id].present?
        candidates = candidates.where("id in (
            SELECT topic_id FROM topic_custom_fields
            WHERE name = 'petition_id' AND value = ?
          )", opts[:petition_id])
      end

      candidate_ids = candidates.pluck(:id)

      return [] unless candidate_ids.present?

      similarity = opts[:similarity].present? ? opts[:similarity].to_i : SiteSetting.title_search_similarity.to_i

      similar = Topic.select(sanitize_sql_array(["topics.*, similarity(topics.title, :title) AS similarity, p.cooked as blurb", title: opts[:title]]))
        .joins("JOIN posts AS p ON p.topic_id = topics.id AND p.post_number = 1")
        .limit(SiteSetting.max_similar_results)
        .where("topics.id IN (?)", candidate_ids)
        .where("similarity(topics.title, :title) > :similarity", title: opts[:title], similarity: similarity)
        .order('similarity desc')

      similar
    end
  end

  require_dependency 'topic_query'
  class ::TopicQuery
    def list_similar
      create_list(:agenda, {}, default_results(@options)) do |topics|
        if @options[:subtype]
          topics = topics.where(subtype: @options[:subtype])
        end

        if @options[:petition_id]
          topics = topics.where("id in (
              SELECT topic_id FROM topic_custom_fields
              WHERE name = 'petition_id' AND value = ?
            )", @options[:petition_id])
        end

        topics
      end
    end
  end

  DiscourseEvent.trigger(:search_extension_ready)
end
