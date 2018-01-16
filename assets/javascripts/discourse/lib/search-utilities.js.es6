import { ajax } from 'discourse/lib/ajax';

var searchSimilarTitles = function(data) {
  return ajax("/search_extension/similar-title", { type: 'POST', data });
};

export { searchSimilarTitles };
