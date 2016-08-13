/**
 * Redux API Action Creator
 * ------------------------
 * Helper to create api action for apiMiddleware
 * See createApiAction.spec.js for full usage.
 *
 * Usage
 * -------
 * ```
 * createApiAction('REFUNDS_CREATE')
 *   .endpoint('POST', '/charges/chrg_39asmdimds/refunds')
 *   .params({ amount: 5000 })
 *   .schema(schemas.refund)
 *   .generate();
 * ```
 */
import constants from 'constants/app.js';

const { CALL_API } = constants;

export default function createApiAction(actionType) {
  if (! actionType) {
    throw new Error('Invalid actionType for args in createApiAction(..)');
  }

  return {
    action: {
      type       : actionType,
      [CALL_API] : {},
    },

    endpoint(method, endpoint) {
      if (typeof method !== 'string' || typeof endpoint !== 'string') {
        throw new Error('args in endpoint(.. , ..) must be string');
      }

      this.action[CALL_API].endpoint = endpoint;
      this.action[CALL_API].method   = method;

      return this;
    },

    params(params) {
      if (typeof params !== 'object') {
        throw new Error('args in params(..) must be object');
      }

      this.action.params           = params;
      this.action[CALL_API].params = params;

      return this;
    },

    schema(schema) {
      if (typeof schema !== 'object') {
        throw new Error('args in schema(..) must be object');
      }

      this.action[CALL_API].schema = schema;

      return this;
    },

    generate() {
      return this.action;
    },
  }
}
