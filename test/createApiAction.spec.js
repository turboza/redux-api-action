import expect           from 'expect';
import { createApiAction } from 'src/modules/redux-action-creator';
import constants        from 'src/constants/app.js';

const { CALL_API, GET, POST, PATCH, DELETE } = constants;

describe('createApiAction', () => {
  it('should throw Error for invalid args', () => {
    expect(() => createApiAction())
      .toThrow();

    expect(() => createApiAction(undefined))
      .toThrow();

    expect(() => createApiAction('action').params(undefined))
      .toThrow();

    expect(() => createApiAction('action').endpoint(undefined, '/charges'))
      .toThrow();

    expect(() => createApiAction('action').endpoint(GET, undefined))
      .toThrow();

    expect(() => createApiAction('action').params(undefined))
      .toThrow();

    expect(() => createApiAction('action').schema(undefined))
      .toThrow();
  });

  it('should return action with type', () => {
    const actual   = createApiAction('CHARGES_LIST').generate();
    const expected = { type: 'CHARGES_LIST', [CALL_API]: {} };

    expect(actual).toEqual(expected);
  });

  it('should return action with endpoint for api', () => {
    const actual =
      createApiAction('USERS_RETRIEVE')
        .endpoint(GET, '/users/me')
        .generate();

    const expected = {
      type: 'USERS_RETRIEVE',
      [CALL_API]: {
        endpoint: '/users/me',
        method: GET,
      },
    }

    expect(actual).toEqual(expected);
  });

  it('should return action with params for api', () => {
    const actual =
      createApiAction('USERS_UPDATE')
        .params({ current_shop: 'shop_234' })
        .generate();
    const expected = {
      type: 'USERS_UPDATE',
      params: { current_shop: 'shop_234' },
      [CALL_API]: {
        params: { current_shop: 'shop_234' },
      },
    };

    expect(actual).toEqual(expected);
  });

  it('should return action with schema for api normalizing', () => {
    const schema = { schema: 'charges' };
    const actual =
      createApiAction('CHARGES_LIST')
        .schema(schema)
        .generate();

    const expected = {
      type: 'CHARGES_LIST',
      [CALL_API]: {
        schema,
      },
    };

    expect(actual).toEqual(expected);

  });

  it('should return action with params for api', () => {
    const actual =
      createApiAction('REFUNDS_CREATE')
        .endpoint(POST, '/charges/chrg_39asmdimds/refunds')
        .params({ amount: 5000 })
        .schema({ schemaName: 'refunds' })
        .generate();

    const expected = {
      type: 'REFUNDS_CREATE',
      params: { amount: 5000 },
      [CALL_API]: {
        endpoint: '/charges/chrg_39asmdimds/refunds',
        method: POST,
        params: { amount: 5000 },
        schema: { schemaName: 'refunds' },
      },
    }

    expect(actual).toEqual(expected);
  });
});
