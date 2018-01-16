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
      params.permit(:title, :category_id, :no_definitions)

      title = params[:title]
      category_id = params[:category_id]

      if title.length > 3
        topics = Topic.similar_title_to(title, category_id, current_user).to_a
      else
        opts = {
          order: 'created',
          category: category_id
        }

        if params[:no_definitions]
          opts[:no_definitions] = true
        end

        topics = TopicQuery.new(nil, opts).list_latest.topics
      end

      render_serialized(topics, SearchExtension::SimilarSerializer, compose_title: params[:title])
    end
  end

  require_dependency 'search'
  Topic.class_eval do
    def self.similar_title_to(title, categoryId, user = nil)
      filter_words = Search.prepare_data(title);
      ts_query = Search.ts_query(filter_words, nil, "|")

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

      if categoryId.present?
        candidates = candidates.where("topics.category_id = ?", categoryId)
      end

      candidate_ids = candidates.pluck(:id)

      return [] unless candidate_ids.present?

      similar = Topic.select(sanitize_sql_array(["topics.*, similarity(topics.title, :title) AS similarity, p.cooked as blurb", title: title]))
        .joins("JOIN posts AS p ON p.topic_id = topics.id AND p.post_number = 1")
        .limit(SiteSetting.max_similar_results)
        .where("topics.id IN (?)", candidate_ids)
        .where("similarity(topics.title, :title) > 0.2", title: title)
        .order('similarity desc')
      similar
    end
  end

  DiscourseEvent.trigger(:search_extension_ready)
end
