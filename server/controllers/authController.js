const express = require('express'); // Express web server framework
//const request = require('request'); // "Request" library
//const cors = require('cors');
//const querystring = require('querystring');
const cookieParser = require('cookie-parser');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();

//We are requesting authorization from the user so our app can access their Google Sheets.  Our app must build and send a GET request to the /authorize endpoint with the following parameters:
//  -client_id: REQUIRED: The client_id generated by the Google API after registering your application response_type.
//  -redirect_uri: REQUIRED: This is the URI to redirect to after the user grants or denies permission.  This URI needs to have been entered in teh Redirect URI allowlist that you specified when registering your application. The value of your redirect_uri in the router must exactly match the value entered when you registered your application, including upper or lowercase, terminating slashes, and such.)
//  -state: OPTIONAL, but STRONGLY recommended: An opaque value used by the client to maintain state between the request and the callback.  The authorization server inclues this value when redirecting the user back to the client.  This provides protection against attacks such as cross-site request forgery (an attack against the client's redirection URI that allows an attack to inject its own authorization code/access token ). See RFC-6749.
//  -scope: OPTIONAL: A space-separated list of scopes.If no scopes are specified, authorization will be granted only to access publicly available information: that is, only information normally visible in the Google desktop, web, and mobile sites.)
//  -show_dialog: OPTIONAL: Whether or not to force the user to approve the app again if they’ve already done so. If false (default), a user who has already approved the application may be automatically redirected to the URI specified by redirect_uri. If true, the user will not be automatically redirected and will have to approve the app again.

//PKCE: Proof Key for Code Exchange:  In AuthCode flow typically, the first call (authorization request) is made through a browser(or, user-agent) to obtain the authorization code. this makes the auth code susceptible to an 'Authorization Code Interception Attack'.  This can happen in a few ways, like having an attacker register a custom URI scheme that matches the response of the auth code request, or gaining access to HTTP req/res logs.
//Idea behind PKCE: Proof of Possession.  Client app gives proof to the auth server that the auth code belongs in the client app in order for the auth server to issue an access token for client app.
//  -Code verifier: REQUIRED: 'high-entropy cryptographic random string' which meets a certain requirement (min 43 chars, max 128 chars, etc)
//  -Code challenge: REQUIRED: created by hashing the code_verifier and base64URL encoding the resulting hash
//  -code_challenge_method: REQUIRED: 'S256' (reference to how it is hashed)
//Basic flow: 1) Client sends auth request along with code_challenge and code_challenge_method to authorization endpoint (URL). 2) The auth server notes the code_challenge and the code_challenge_method and issues the auth code. 3) The client will send an access token request to the auth endpoint/URL along with the code_verifier. 4) the auth server validates the code_verifier with the already received code_challenge and the code_challenge_method and issues the access token if the validation is successful.
//every time an auth request is made, a new code challenge is sent.

// ! SET REDIRECT URL TO 8080 TO RUN IN DEV MODE. CHANGE TO 3000 IF IN PRODUCTION

// const stateKey = 'google_auth_state';

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */

//function to create a random string to be stored as a state variable for added security
const generateRandomString = function (length) {
	let text = '';
	const possible =
		'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

	for (let i = 0; i < length; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
};

const authController = {};

//this middleware function creates the oauth2 client as well as the url that will be used for the consent dialog

authController.initializeAuth = async (req, res, next) => {
	console.log('in authController createAuthUrl');

	try {
		//creates a new instance of a OAuth2 client
		const oauth2Client = new google.auth.OAuth2(
			process.env.GOOGLE_CLIENT_ID,
			process.env.GOOGLE_CLIENT_SECRET,
			'http://localhost:8080/callback'
		);

		console.log(oauth2Client);
		const scopes = 'https://www.googleapis.com/auth/spreadsheets';
		const state = generateRandomString(16);

		//generate a code_verifier and code_challenge
		//const codes = await OAuth2Client.generateCodeVerifierAsync();
		//console.log('the codes are ', codes);

		//passes in an options object to generateAuthUrl
		const url = oauth2Client.generateAuthUrl({
			//recommended: indicates whether your app can refresh access tokens when the user is not present at the browser.  default is 'online', 'offline' is if your app needs to refresh access tokens when user is not present at browser
			access_type: 'offline', //gets a refresh token
			//required: identify resources that pp can access on user's behalf
			scope: scopes,
			state: state,
			// response_type: code,
			// //when using generateCodeVerifierAsync, make sure to use code_challenge_method 'S256';
			// code_challenge_method: 'S256',
			// //pass along the generated code challenge
			// code_challenge: codes.codeChallenge,
		});

		console.log('auth url is ', url);
		res.locals.authUrl = url;
		next();
	} catch (error) {
		return next({
			log: 'error in authController.createAuthUrl: ',
			message: {
				error: 'An error occured while redirecting to Google ',
				error,
			},
		});
	}
};

authController.handleCallback = () => {};

//
// authController.initializeAuth = (req, res, next) => {
// 	try {
// 		const state = generateRandomString(16);
// 		// store created state on a cookie for google oauth communication with server
// 		res.cookie(stateKey, state);
// 		console.log('cookie stateKey: ', state);

// 		// object sent as res.query to google so your application can request authorization
// 		const scope = 'user-read-private user-read-email';
// 		scopes: ['https://www.googleapis.com/auth/spreadsheets'],
// 			//creates the url query string for the front end to handle
// 			(res.locals.reqAuthentication = querystring.stringify({
// 				response_type: 'code',
// 				client_id: GOOGLE_CLIENT_ID,
// 				scope: scope,
// 				redirect_uri: redirect_uri,
// 				state: state,
// 			}));
// 		console.log('initialize auth url complete');
// 		return next();
// 	} catch (err) {
// 		return next({
// 			log: 'error in authController.initializeAuth: ' + err,
// 			message: 'An error occured while redirecting to Google',
// 		});
// 	}
// };

// // check spotify's response for state parameter
// authController.checkState = (req, res, next) => {
// 	// the state parameter will tell us if the user was authenticated by spotify, if they did not choose to redirect to spotify, or if there was an error
// 	const storedState = req.cookies ? req.cookies[stateKey] : null;

// 	try {
// 		const state = req.query.state || null;
// 		console.log('state returned from spotify: ', state);

// 		if (state === null || state !== storedState) {
// 			// user choose not to redirect to spotify or there was an error

// 			//! spotify's example:
// 			/*
//       res.redirect('/#' +
//         querystring.stringify({
//           error: 'state_mismatch'
//         }));
//       */

// 			return next({
// 				log: 'spotify authentication: state mismatch. No error.',
// 				message: 'Error authenticating user. Please try again.',
// 			});
// 		} else {
// 			// spotify authenticated user credentials
// 			return next();
// 		}
// 	} catch (err) {
// 		return next({
// 			log: 'error in authController.checkState: ' + err,
// 			message: 'Error authenticating user. Please try again.',
// 		});
// 	}
// };

// ! bad practice - making a post request in middleware
// need to update the structure of this middleware and add the post request to router, but just checking if functional for now based off spotify examples
// request access tokens from spotify
authController.getTokens = (req, res, next) => {
	const code = req.query.code || null;
	console.log('CODE: ', code);
	// clear statekey that was stored on cookie as it's no longer needed. Will be using access and refresh token to communicate with spotify api
	res.clearCookie(stateKey);
	const authOptions = {
		url: 'https://accounts.spotify.com/api/token',
		form: {
			code: code,
			redirect_uri: redirect_uri,
			grant_type: 'authorization_code',
		},
		headers: {
			Authorization:
				'Basic ' +
				new Buffer(client_id + ':' + client_secret).toString('base64'),
		},
		json: true,
	};

	// request refresh and access tokens from spotify
	request.post(authOptions, function (error, response, body) {
		if (!error && response.statusCode === 200) {
			console.log('body: ', body);
			// Object.values(body)[0]
			// Object.values(body)[3]
			res.locals.accessToken = body.access_token;
			res.locals.refreshToken = body.refresh_token;

			res.locals.options = {
				url: 'https://api.spotify.com/v1/me',
				headers: { Authorization: 'Bearer ' + res.locals.refreshToken },
				json: true,
			};

			// TODO: STORE ACCESS TOKENS IN DATABASE

			return next();

			// ! spotify example
			/*
        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body);
        });
        */

			// ! spotify example
			/*
        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
        */
		} else {
			return next({
				log: 'spotify authentication: invalid token',
			});
		}
	});
};

module.exports = authController;
