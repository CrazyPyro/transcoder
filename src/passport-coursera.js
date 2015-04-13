// Based on https://github.com/jaredhanson/passport-github
// Modified by Neil Funk per https://tech.coursera.org/app-platform/oauth2/
var passport = require('passport');
var util = require('util')
  , OAuth2Strategy = require('passport-oauth2')
  //, Profile = require('./profile')
  , InternalOAuthError = require('passport-oauth2').InternalOAuthError;

function Strategy(options, verify) {
  options = options || {};
  options.authorizationURL = options.authorizationURL || 'https://accounts.coursera.org/oauth2/v1/auth';
  //'?response_type=code&client_id='+options.clientID+'&redirect_uri='+options.callbackURL+'&scope=view_profile&state=confusion';
  options.tokenURL = options.tokenURL || 'https://accounts.coursera.org/oauth2/v1/token';
  options.scopeSeparator = options.scopeSeparator || '+';
  options.customHeaders = options.customHeaders || {};

  if (!options.customHeaders['User-Agent']) {
    options.customHeaders['User-Agent'] = options.userAgent || 'passport-coursera';
  }

  OAuth2Strategy.call(this, options, verify);
  this.name = 'coursera';
  // this._userProfileURL = options.userProfileURL || 'https://api.github.com/user';
  this._oauth2.useAuthorizationHeaderforGET(true);
}
util.inherits(Strategy, OAuth2Strategy);

module.exports = Strategy;
