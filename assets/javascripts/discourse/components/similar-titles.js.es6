import MountWidget from 'discourse/components/mount-widget';
import { observes, on } from 'ember-addons/ember-computed-decorators';
import { searchSimilarTitles } from '../lib/search-utilities';

export default MountWidget.extend({
  tagName: 'ul',
  classNameBindings: [":similar-titles"],
  widget: 'similar-titles',
  topics: Ember.A(),
  title: '',
  showResults: true,

  @observes('topics.[]', 'showResults')
  _rerender() {
    this.queueRerender();
  },

  buildArgs() {
    const showResults = this.get('showResults');
    if (!showResults) return {};

    const topics = this.get('topics');
    const none = this.get('none');
    return {
      topics,
      none
    };
  },

  @on('init')
  @observes('title')
  runSearch() {
    Ember.run.debounce(this, this.search, 300);
  },

  search() {
    const title = this.get('title');
    const allowBlankSearch = this.get('allowBlankSearch');

    if (!allowBlankSearch && title.length < 3) return;

    const requireCategory = this.get('requireCategory');
    const categoryId = this.get('categoryId') || '';
    const topics = this.get('topics');
    const noDefinitions = this.get('noDefinitions');

    if (requireCategory && !categoryId) return;

    searchSimilarTitles({
      title,
      category_id: categoryId,
      no_definitions: noDefinitions
    }).then(result => {
      topics.clear();
      topics.pushObjects(result);
      this.sendAction('afterTitleSearch', result);
    });
  },
});
