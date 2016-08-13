/* eslint-disable camelcase */
import nock               from 'nock'
import configureMockStore from 'redux-mock-store'
import expect             from 'expect';
import FormData           from 'form-data';

import config             from 'config.js';
import constants          from 'constants/app.js';
import errors             from 'constants/errors.js';
import types              from 'src/constants/actionTypes.js';
import schemas            from 'src/modules/omiseAPI/schemas.js'
import apiMiddleware      from 'src/core/middlewares/apiMiddleware.js';

const middlewares = [apiMiddleware];
const mockStore   = configureMockStore(middlewares)

const { GET, POST, PUT, DELETE, PATCH } = constants;

describe('apiMiddleware', () => {
  beforeEach(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('Normal Action (Bypassing API Middleware)', () => {
    it('creates normal action if no key [CALL_API]', (done) => {
      const inputAction = {
        type: 'GET_SOMETHING',
        endpoint: '/test',
      };
      const expectedActions = [{
        type: 'GET_SOMETHING',
        endpoint: '/test',
      }];

      const store = mockStore({}, expectedActions, done)
      store.dispatch(inputAction);
    });
  });

  describe('API Action (Processed by API Middleware)', () => {
    describe('wihout Normalizer', () => {
      describe('GET method', () => {
        it('should creates async LOADING(REQUEST) action and SUCCESS action', (done) => {
          const body = { data: ['a', 'b', 'c'] };
          nock(config.API_URL).get('/test').reply(200, body);

          const inputAction = {
            type: 'GET_SOMETHING',
            [constants.CALL_API]: {
              endpoint: '/test',
              method: GET,
            },
          };
          const expectedActions = [
            { type: 'GET_SOMETHING', _status: constants.LOADING },
            { type: 'GET_SOMETHING', _status: constants.SUCCESS, result: { body, rawBody: body }, entities: undefined },
          ];

          const store = mockStore({}, expectedActions, done)
          store.dispatch(inputAction);
        });

        it('should creates async LOADING(REQUEST) action and FAILURE action for Normal Error', (done) => {
          const body = {
            object: 'error',
            location: 'https://www.omise.co/api-errors#not-found',
            code: 'not_found',
            message: 'Customer cust_test_000000000000 was not found',
          }
          nock(config.API_URL).get('/test').reply(404, body);

          const inputAction = {
            type: 'GET_SOMETHING',
            [constants.CALL_API]: {
              endpoint: '/test',
              method: GET,
            },
          };
          const expectedActions = [
            { type: 'GET_SOMETHING', _status: constants.LOADING },
            { type: 'GET_SOMETHING', _status: constants.FAILURE, result: { httpStatus: 404, body } },
          ];

          const store = mockStore({}, expectedActions, done)
          store.dispatch(inputAction);
        });

        it('should create async LOADING(REQUEST) action and FAILURE action for "URL Not found" Error', (done) => {

          const inputAction = {
            type: 'GET_SOMETHING',
            [constants.CALL_API]: {
              endpoint: '/not-existing-api-no-mock',
              method: GET,
            },
          };
          const expectedActions = [
            { type: 'GET_SOMETHING', _status: constants.LOADING },
            { type: 'GET_SOMETHING', _status: constants.FAILURE, result: { body: errors.UNKNOWN_ERROR } },
          ];

          const store = mockStore({}, expectedActions, done)
          store.dispatch(inputAction);
        });

        it('should create FAILURE action if parsing response.json() error', (done) => {
          const body = 'invalid body';
          nock(config.API_URL).get('/test').reply(200, body);

          const inputAction = {
            type: 'GET_SOMETHING',
            [constants.CALL_API]: {
              endpoint: '/test',
              method: GET,
            },
          };
          const expectedActions = [
            { type: 'GET_SOMETHING', _status: constants.LOADING },
            { type: 'GET_SOMETHING', _status: constants.FAILURE, result: { body: errors.UNKNOWN_ERROR } },
          ];

          const store = mockStore({}, expectedActions, done)
          store.dispatch(inputAction);
        });

        xit('should put the params into the url', () => {
          // TODO: implement the test
        });
      });

      describe('Non-GET method', () => {
        xit('PUT should create POST request (Laravel requirement). And should not have params in url and have formData in body instead', (done) => {
          // TODO: Implement all not-GET method test
        });
      });
    });

    describe('with Normalizer', () => {
      afterEach(() => {
        nock.cleanAll()
      });

      it('should have schema defined', () => {
        expect(schemas.CHARGES).toNotBeA('undefined');
        expect(schemas.LIST_CHARGES).toNotBeA('undefined');
      });

      it('should normalize the charge list', (done) => {
        const charges = {
          limit: 20,
          offset: 0,
          data: [
            { id: 'charge_1', amount: 200000, card: { id: 'card_test_111', brand: 'bankA'} },
            { id: 'charge_2', amount: 500000, card: { id: 'card_test_111', brand: 'bankA'}},
            { id: 'charge_4', amount: 90000,  card: { id: 'card_test_222', brand: 'bankB'} },
          ],
        };
        const normalized = {
          entities: {
            cards: {
              card_test_111: { id: 'card_test_111', brand: 'bankA' },
              card_test_222: { id: 'card_test_222', brand: 'bankB' },
            },
            charges: {
              charge_1: { id: 'charge_1', amount: 200000, card: 'card_test_111' },
              charge_2: { id: 'charge_2', amount: 500000, card: 'card_test_111' },
              charge_4: { id: 'charge_4', amount: 90000,  card: 'card_test_222' },
            },
          },
          result: {
            limit: 20,
            offset: 0,
            data: [ 'charge_1', 'charge_2', 'charge_4' ],
          },
        }
        nock(config.API_URL).get('/charges').reply(200, charges);

        const inputAction = {
          type: 'GET_CHARGE_LIST_TEST',
          [constants.CALL_API]: {
            method: GET,
            endpoint: '/charges',
            schema: schemas.LIST_CHARGES,
          },
        }
        const expectedActions = [
          { type: 'GET_CHARGE_LIST_TEST', _status: constants.LOADING },
          { type: 'GET_CHARGE_LIST_TEST', _status: constants.SUCCESS, result: { body: normalized.result, rawBody: charges }, entities: normalized.entities },
        ]
        const store = mockStore({}, expectedActions, done)
        store.dispatch(inputAction);
      });

      it('should normalize the charge detail', (done) => {
        const charge = {
          id: 'charge_1',
          amount: 200000,
          card: { id: 'card_test_111', brand: 'bankA'},
          refunds: {
            offset: 10,
            limit: 20,
            total: 2,
            data: [
              { id: 'refund_1', amount: 10 },
              { id: 'refund_9', amount: 9999 },
            ],
          },
        };
        const normalized = {
          entities: {
            cards: {
              card_test_111: { id: 'card_test_111', brand: 'bankA' },
            },
            charges: {
              charge_1: {
                id: 'charge_1',
                amount: 200000,
                card: 'card_test_111',
                refunds: {
                  offset: 10,
                  limit: 20,
                  total: 2,
                  data: ['refund_1', 'refund_9'],
                },
              },
            },
            refunds: {
              refund_1: { id: 'refund_1', amount: 10 },
              refund_9: { id: 'refund_9', amount: 9999 },
            },
          },
          result: 'charge_1',
        };
        nock(config.API_URL).get('/charges/abc').reply(200, charge);

        const inputAction = {
          type: 'GET_CHARGE_DETAIL_TEST',
          [constants.CALL_API]: {
            method: GET,
            endpoint: '/charges/abc',
            schema: schemas.CHARGES,
          },
        };
        const expectedActions = [
          { type: 'GET_CHARGE_DETAIL_TEST', _status: constants.LOADING },
          { type: 'GET_CHARGE_DETAIL_TEST', _status: constants.SUCCESS, entities: normalized.entities, result: { body: normalized.result, rawBody: charge } },
        ];

        const store = mockStore({}, expectedActions, done)
        store.dispatch(inputAction);
      });
    });

    it('should not normalize if the request is failed', (done) => {
      const errorBody = {
        code: 'not_found',
        message: 'Cannot find charge',
      }
      nock(config.API_URL).get('/charges/abc').reply(404, errorBody);

      const inputAction = {
        type: 'GET_CHARGE_DETAIL_TEST',
        [constants.CALL_API]: {
          method: GET,
          endpoint: '/charges/abc',
          schema: schemas.CHARGES,
        },
      };
      const expectedActions = [
        { type: 'GET_CHARGE_DETAIL_TEST', _status: constants.LOADING },
        { type: 'GET_CHARGE_DETAIL_TEST', _status: constants.FAILURE, result: { body: errorBody, httpStatus: 404 } },
      ];

      const store = mockStore({}, expectedActions, done)
      store.dispatch(inputAction);
    });
  });
});
