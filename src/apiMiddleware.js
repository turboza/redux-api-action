/**
 * Redux API Middleware
 * =======================
 * This is api middleware which will help async create loading and success/failure
 * actions based on input action. Also it provide promise for then chaining too.
 *
 * Ex.
 * Dispatching this action...
 * > dispatch({ type: 'GET_OMISE', CALL_API: { endpoint: '/test' } })
 *
 * Will actually dispatch another 2 actions asynchronously...
 * > dispatch({ type: 'GET_OMISE', _status: 'LOADING' })
 * > dispatch({ type: 'GET_OMISE', _status: 'SUCCESS', result: {...} } })
 *
 * Usage
 * ```
 * function callApi(id) {
 *   return {
 *     types: [CREATE_CHARGE],
 *     [CALL_API]: {
 *       endpoint: '/charges',
 *       params: { header: { method: 'POST' } }
 *       schema: schemas.CHARGES
 *     }
 *     others,
 *   };
 * }
 * ```
 */
import fetch          from 'isomorphic-fetch';
import FormData       from 'form-data';
import { normalize }  from 'normalizr';

import config         from 'config.js';
import constants      from 'constants/app.js';
import errors         from 'constants/errors.js';
import paramSerialize from 'helpers/paramSerialize.js';

const { CALL_API, LOADING, SUCCESS, FAILURE, GET, POST } = constants;

const apiEngine = config.API_ENGINE;
const apiUrl    = config.API_URL;

/**
 * Redux API Middleware
 * -----------------------
 */
export default () => next => action => {
  // Skip this middleware if no [CALL_API] defined
  if (! action.hasOwnProperty(CALL_API)) {
    return next(action);
  }

  const nextParams = { ...params, _method: POST };

  // Extract action
  const { [CALL_API]: { endpoint, params, schema, method }, type, ...rest } = action;

  const url         = getFetchUrl(endpoint, method, params);
  const fetchParams = getFetchParams(endpoint, method, params);

  // Dispatch loading action
  next(createLoadingAction(type, rest));

  // Fetch result and dispatch success/error action
  return fetch(url, fetchParams)
    .then(response => handleError(response))
    .then(response => response.json())
    .then(body => next(createSuccessAction(type, rest, body, schema)))
    .catch(error => next(createErrorAction(type, rest, error)))
}

/**
 * Helper - Get Fetch Url
 * ------------------------
 * @param endpoint {string} api endpoint ex. '/charges'
 * @param method   {string} restful method in all cap ex. 'POST'
 * @param [params] {object} addition parameters for fetch
 *
 * @return url     {string} url for fetch input with query for GET method
 */
// TODO: Write test
function getFetchUrl(endpoint, method, params) {
  const url = apiUrl + endpoint;

  return method === GET ? url + paramSerialize(params) : url;
}

/**
 * Helper - Get Fetch params
 * ---------------------------
 * @param endpoint     {string} api endpoint ex. '/charges'
 * @param method       {string} restful method in all cap ex. 'POST'
 * @param [params]     {object} addition parameters for fetch
 *
 * @return fetchParams {object} fetch params depends on api engine
 */
// TODO: Write test
function getFetchParams(endpoint, method, params) {
  const defaultParams = {
    credentials: 'include', // enable cookies for authenticataion
  };

  if (method === GET) {
    return { ...defaultParams, method };
  }

  // For non-GET methods
  if (apiEngine === 'Laravel 5') {
    // Laravel requires to use POST and put real method in `_method`
    // ref: https://laravel.com/docs/master/routing#form-method-spoofing
    return {
      ...defaultParams,
      method : POST,
      body   : getFormData({ ...params, _method: method }),
    }
  }
  else {
    return {
      ...defaultParams,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    };
  }
}

/**
 * Helper - Build Form Data
 * --------------------------
 * ref: https://developer.mozilla.org/en/docs/Web/API/FormData
 *
 * @param data      {object} data to convert to FormData
 *
 * @return formData {FormData} form-like data for js form submissions
 */
// TODO: Write test
function getFormData(data) {
  // Construct form data
  const formData = new FormData();

  // Append all data into formData
  for (const key in data) {
    if (data.hasOwnProperty(key) && typeof data[key] !== 'undefined') {
      formData.append(key, data[key]);
    }
  }

  return formData;
}


/**
 * Helper - Error Handler
 * ------------------------
 * Since fetch considers error status, ex. 404, as success
 * We need to handle error manually
 */
// TODO: Write test
function handleError(response) {
  if (! response.ok) {
    return response.json().then(body => {
      throw ({ body, httpStatus: response.status });
    });
  }

  return response;
};

/**
 * Helper - Normalize Result
 * ---------------------------
 * In order to avoid the state to store too many duplicate data,
 * we will normalize the response body and let reducers merge it to entities.
 * Read more: https://github.com/gaearon/normalizr
 *
 * Note: Schema was defined in modules/omiseAPI/schemas.js
 *
 * @param {object} body - api response.body
 * @param {object} [schema] - optional: if schema is undefined, normalizer will not trigger
 *
 * @return { result: { normalized data }, entities: { normalized entities } }
 */
function getNormalized (body, schema) {
  if (! schema) return { result: body };

  return normalize(body, schema);
}

/**
 * Action Creator - Loading
 * --------------------------
 */
function createLoadingAction(type, rest) {
  return {
    type,
    ...rest,
    _status: LOADING,
  };
};

/**
 * Action Creator - Success
 * --------------------------
 */
function createSuccessAction(type, rest, body, schema) {
  const normalized = getNormalized(body, schema);

  return {
    type,
    ...rest,
    _status: SUCCESS,
    result: { body: normalized.result, rawBody: body },
    entities: normalized.entities,
  }
}

/**
 * Action Creator - Error
 * --------------------------
 */
function createErrorAction(type, rest, error) {
  let errorResult;

  // Check if error is native error (TypeError, ReferenceError, ...)
  if (error instanceof Error) {
    // Too many types of native error, just return unknown error
    console.error(error);
    errorResult = { body: errors.UNKNOWN_ERROR };
  }
  else {
    errorResult = { body: error.body, httpStatus: error.httpStatus };
  }

  return {
    type,
    ...rest,
    _status: FAILURE,
    result: errorResult,
  }
}
