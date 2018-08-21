import MountWidget from 'discourse/components/mount-widget';
import { observes, on } from 'ember-addons/ember-computed-decorators';
import { searchSimilarTitles } from '../lib/search-utilities';

export default MountWidget.extend({
  tagName: 'div',
  classNameBindings: [":similar-titles"],
  widget: 'similar-titles',
  topics: Ember.A(),
  title: '',
  showResults: true,
  priorSearch: null,

  didInsertElement() {
    this._super();
    this.appEvents.on("similar-titles:reset-topics", this, this.resetTopics);
  },

  resetTopics() {
    if (this._state !== 'destroying') {
      this.set('topics', Ember.A());
    }
  },

  @observes('topics.[]', 'showResults')
  resultsChanged() {
    this.queueRerender();
  },

  buildArgs() {
    const showResults = this.get('showResults');
    if (!showResults) return {};

    const topics = this.get('topics');
    let args = { topics };

    const none = this.get('none');
    if (none) args['none'] = none;

    const translatedNone = this.get('translatedNone');
    if (translatedNone) args['translatedNone'] = translatedNone;

    const includeGutter = this.get('includeGutter');
    if (includeGutter) args['includeGutter'] = includeGutter;

    return args;
  },

  @on('init')
  @observes('title')
  runSearch() {
    Ember.run.debounce(this, this.search, 300);
  },

  search() {
    if (this._state === 'destroying') return;

    const title = this.get('title');
    const allowBlankSearch = this.get('allowBlankSearch');

    if (!allowBlankSearch && title.length < 3) return;

    const searchDisabled = this.get('searchDisabled');
    if (searchDisabled) return;

    const requireCategory = this.get('requireCategory');
    const categoryId = this.get('categoryId') || '';
    const topics = this.get('topics');
    const noDefinitions = this.get('noDefinitions');

    if (requireCategory && !categoryId) return;

    let params = {
      title,
      category_id: categoryId,
      no_definitions: noDefinitions
    };

    const similarity = this.get('similarity');
    if (similarity) {
      params['similarity'] = similarity;
    }

    const subtype = this.get('subtype');
    if (subtype) {
      params['subtype'] = subtype;
    }

    this.sendAction('searching', true);

    searchSimilarTitles(params).then(result => {
      if (this._state === 'destroying') return;

      topics.clear();

      if (result.length) {
        topics.pushObjects(result);
      }

      this.sendAction('afterTitleSearch', result);
    }).finally(() => {
      this.sendAction('searching', false);
    });
  },

  close() {
    this.set('showResults', false);
  }
});
