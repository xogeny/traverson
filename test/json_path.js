'use strict';

var traverson = require('../traverson')
  , util = require('util')
  , mockResponse = require('traverson-mock-response')()
  , waitFor = require('poll-forever')
  , chai = require('chai')
  , sinon = require('sinon')
  , sinonChai = require('sinon-chai')
  , assert = chai.assert
  , expect = chai.expect;

chai.use(sinonChai);

describe('Traverson with JSONPath', function() {

  var get;
  var callback;

  var rootUri = 'http://api.example.org';
  var uri = rootUri + '/path/to/resource';
  var rootResponse = mockResponse({
    deeply: { nested: { link: uri } }
  });

  var result = mockResponse({ the: 'result' });

  var api = traverson.from(rootUri).json();

  beforeEach(function() {
    get = sinon.stub();
    api.requestModuleInstance = { get: get };
    callback = sinon.spy();
  });

  it('should follow to a link via JSONPath expression', function(done) {
    get
    .withArgs(rootUri, {}, sinon.match.func)
    .callsArgWithAsync(2, null, rootResponse);
    get
    .withArgs(uri, {}, sinon.match.func)
    .callsArgWithAsync(2, null, result);

    api.
    newRequest()
    .follow('$.deeply.nested.link').getResource(callback);

    waitFor(
      function() { return callback.called; },
      function() {
        expect(callback).to.have.been.calledWith(null, result.doc);
        done();
      }
    );
  });

  it('should call callback with err if JSONPath has no match',
      function(done) {
    get
    .withArgs(rootUri, {}, sinon.match.func)
    .callsArgWithAsync(2, null, rootResponse);

    api.
    newRequest()
    .follow('$.deeply.nested.blink').getResource(callback);

    waitFor(
      function() { return callback.called; },
      function() {
        expect(callback).to.have.been.calledWith(sinon.match.
            instanceOf(Error));
        expect(callback.args[0][0].message).to.contain('JSONPath ' +
            'expression $.deeply.nested.blink returned no match');
        done();
      }
    );
  });

  it('should call callback with err if JSONPath has multiple matches',
      function(done) {
    var rootResponseMulti = mockResponse({
      arr: [ { foo: 'bar' }, { foo: 'baz' } ]
    });

    get
    .withArgs(rootUri, {}, sinon.match.func)
    .callsArgWithAsync(2, null, rootResponseMulti);

    api.
    newRequest()
    .follow('$.arr[*].foo').getResource(callback);

    waitFor(
      function() { return callback.called; },
      function() {
        expect(callback).to.have.been.calledWith(sinon.match.
            instanceOf(Error));
        expect(callback.args[0][0].message).to.contain('JSONPath ' +
            'expression $.arr[*].foo returned more than one match');
        done();
      }
    );
  });
});

