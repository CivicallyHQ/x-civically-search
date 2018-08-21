import { createWidget } from 'discourse/widgets/widget';
import { h } from 'virtual-dom';

export default createWidget('similar-titles', {
  tagName: 'ul.similar-titles-widget',

  html(attrs) {
    if (attrs.topics && attrs.topics.length) {
      let identical = false;

      let html = attrs.topics.map(t => {
        let contents = [ this.attach('similar-title-link', {
          url: t.url,
          title: t.title,
          identical: t.identical
        })];

        if (t.identical) identical = true;

        return h('li', contents);
      });

      if (attrs.includeGutter) {
        let gutter = [];
        gutter.push(h('span', I18n.t(`search.${identical ? 'identical' : 'similar'}`)));
        gutter.push(this.attach('link', {
          action: 'close',
          icon: 'times',
        }));
        html.push(h('div.gutter', gutter));
      }

      return html;
    };

    if (attrs.translatedNone) {
      return h('li', [attrs.translatedNone]);
    }

    if (attrs.none) {
      return h('li', I18n.t(attrs.none));
    }

    return '';
  },

  close() {
    this._sendComponentAction('close');
  }
});
