# local-lambda-runner

Utility for running an API gateway locally. Basically copies down what AWS says about the API gateway and the lambda
integrations (including code and environment variables) and runs it locally via Express.

The idea behind this project is that many tools for running AWS locally are very large and take a lot of
effort to setup. This is handy if you just want to test and debug your lambdas behind an API gateway 
locally without all that hassle.

Refer to the src/config-example.js file for how to configure this. Basically you specify the API gateway name(s) and region
and it goes out to AWS to download the routes and the code. And then it uses that information to setup an express API
that mimics the API gateway. It currently can't do what AWS gateway authorizors can do.
- the api_names do an "includes" to match up against AWS, so it can be part of the API gateway name (comes
  in handy if your API gateway name includes the region or account)
- the "download" field can be set to false if you don't want to wait to redownload the code, like if you've already run 
  it before and you want it to start up fast
- the commented out sections for "environmentVariables" and "local_lambda_overrides" are handy if you want to run a
  lambda version locally that is not deployed in AWS. You can override it with your own envs and your own local code.

## To run this locally

- Install and login to aws-cli (the account you log in to is what will be copied down)
- Run `npm install` in the root of this project
- Create a config.js file in the root of the project. Refer to the config-example.js file.
- Run `./start` (you may need to do `chmod +x start` first)
- That's it!