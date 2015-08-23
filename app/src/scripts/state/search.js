export const REQUEST_SEARCH_RESULTS = 'REQUEST_SEARCH_RESULTS';
export const RECEIVE_SEARCH_RESULTS = 'RECEIVE_SEARCH_RESULTS';
export const INPUT_SEARCH_QUERY = 'INPUT_SEARCH_QUERY';
export const CHANGE_FILTER = 'CHANGE_FILTER';
export const SELECT_SEARCH_OFFSET = 'SELECT_SEARCH_OFFSET';
export const SELECT_SORT_TYPE = 'SELECT_SORT_TYPE';

import request from 'superagent';

import { RESULTS_PER_PAGE, DEFAULT_SEARCH_SORT } from '../constants/Search';

import SearchSortTypes from '../constants/SearchSortTypes';

function sortOption(sortType) {
  return SearchSortTypes[sortType].option;
}

function fetchSearchResults(state) {
  const query = state.query
    ? {
      'multi_match': {
        'type': 'phrase_prefix',
        'query': state.query,
        'max_expansions': 50,
        'slop': 10,
        'fields': ['name', 'authors']
      }
    }
    : undefined;

  const filter = state.filter
    ? state.filter
    : undefined;

  const aggs = {
    'number_of_images_stats': {
      'stats': {
        'field': 'number_of_images'
      }
    },
    'handedness': {
      'terms': {
          'field': 'handedness'
      }
    },
    'nested_aggs': {
      'nested': {
        'path': 'images'
      },
      'aggs': {
        'modality': {
          'terms': {
            'field': 'images.modality'
          }
        },
        'map_type': {
          'terms': {
            'field': 'images.map_type'
          }
        }
      }
    }
  };

  return request.post('/search')
    .send({
      query: {
        filtered: {
          query: query,
          filter: filter
        }
      },
      size: RESULTS_PER_PAGE,
      from: state.from,
      sort: sortOption(state.sort),
      aggs: aggs
    })
    .type('json')
    .accept('json');
}

function receiveSearchResults(results) {
  return {
    type: RECEIVE_SEARCH_RESULTS,
    results
  };
}

export function loadSearchResults(action) {
  return (dispatch, getState) => {
    dispatch(action);
    return fetchSearchResults(getState().search)
      .end((err, res) => dispatch(receiveSearchResults(res.body)));
  };
}

export function inputSearchQuery(query) {
  return {
    type: INPUT_SEARCH_QUERY,
    query
  };
}

export function selectSearchOffset(offset) {
  return {
    type: SELECT_SEARCH_OFFSET,
    offset
  };
}

export function selectSortType(sortType) {
  return {
    type: SELECT_SORT_TYPE,
    sortType
  };
}

export function changeFilter(filter) {
  return {
    type: CHANGE_FILTER,
    filter
  };
}

export default function reducer(state = {
    isFetching: false,
    query: '',
    filter: null,
    from: 0,
    sort: DEFAULT_SEARCH_SORT
  }, action) {
  switch (action.type) {
    case REQUEST_SEARCH_RESULTS:
      return Object.assign({}, state, {
        isFetching: true
      });
    case RECEIVE_SEARCH_RESULTS:
      return Object.assign({}, state, {
        isFetching: false,
        results: action.results
      });
    case INPUT_SEARCH_QUERY:
      return Object.assign({}, state, {
        query: action.query,
        from: 0
      });
    case CHANGE_FILTER:
      return Object.assign({}, state, {
        filter: action.filter,
        from: 0
      });
    case SELECT_SEARCH_OFFSET:
      return Object.assign({}, state, {
        from: action.offset
      });
    case SELECT_SORT_TYPE:
      return Object.assign({}, state, {
        sort: action.sortType,
        from: 0
      });
    default:
      return state;
  }
}

