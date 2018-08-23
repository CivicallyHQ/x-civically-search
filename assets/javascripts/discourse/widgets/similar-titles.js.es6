import { createWidget } from 'discourse/widgets/widget';
import { h } from 'virtual-dom';

export default createWidget('similar-titles', {
  tagName: 'div.similar-titles-widget',

  html(attrs) {
    let contents = [];

    if (attrs.topics && attrs.topics.length) {
      let identical = false;

      contents = attrs.topics.map(t => {
        let linkContents = [ this.attach('similar-title-link', {
          url: t.url,
          title: t.title,
          identical: t.identical
        })];

        if (t.identical) identical = true;

        return h('li', linkContents);
      });

      if (attrs.includeGutter) {
        let gutter = [];
        gutter.push(h('span', I18n.t(`search.${identical ? 'identical' : 'similar'}`)));
        gutter.push(this.attach('link', {
          action: 'close',
          icon: 'times',
        }));

        contents.push(h('div.gutter', gutter));
      }
    };

    if (attrs.translatedNone) {
      contents.push(h('li', [attrs.translatedNone]));
    }

    if (attrs.none) {
      contents.push(h('li', I18n.t(attrs.none)));
    }

    if (contents.length) {
      return h('ul', contents);
    } else {
      return '';
    }
  },

  close() {
    this._sendComponentAction('close');
  }
});
