# Redux API Action
Elegant and easy way to call API in redux with promise.

> Status: Work in progress

## Why Redux API Action?
It's not hard to create API action with thunk or promise middleware, but as the project get bigger. There are a lot of code duplication and hard to test or change.

### Example

Creating action
```js
import { createApiAction } from 'redux-api-action';

const getPosts = () => {
  return createApiAction('GET_POSTS')
    .endpoint('GET', '/api/posts')
    .generate()
}
```

When `getPosts` is dispatched, it will actually dispatch 2 actions like this.

1. This action will be instantly dispatched
```js
{
  type: 'GET_POSTS',
  _status: 'LOADING'
}
```

2. After data is loaded, the other action will be dispatched
```js
{
  type: 'GET_POSTS',
  _status: 'SUCCESS',
  result: {
    body: [
      { id: 1, title: 'Sample post' },
      { id: 2, title: 'This is a second post' },
      { id: 3, title: 'Welcome to my blog' }
    ]
  }
}
```
