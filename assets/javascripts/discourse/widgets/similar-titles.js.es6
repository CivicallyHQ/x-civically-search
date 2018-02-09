import { createWidget } from 'discourse/widgets/widget';
import { h } from 'virtual-dom';

export default createWidget('similar-titles', {
  tagName: 'div.similar-titles-widget',

  html(attrs) {
    if (attrs.topics && attrs.topics.length) {
      return attrs.topics.map(t => {
        let contents = [ this.attach('similar-title-link', {
          url: t.url,
          title: t.title,
          identical: t.identical
        })];

        return h('li', contents);
      });
    };

    if (attrs.translatedNone) {
      return h('li', [attrs.translatedNone]);
    }

    if (attrs.none) {
      return h('li', I18n.t(attrs.none));
    }

    return '';
  }
});
