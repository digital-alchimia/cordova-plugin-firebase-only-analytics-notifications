var fs = require("fs");
var path = require("path");
var utils = require("../../configurations/utilities");

function rootBuildGradleExists() {
  var target = path.join("platforms", "android", "build.gradle");
  return fs.existsSync(target);
}

/*
 * Helper function to read the build.gradle that sits at the root of the project
 */
function readRootBuildGradle() {
  var target = path.join("platforms", "android", "build.gradle");
  return fs.readFileSync(target, "utf-8");
}

/*
 * Added a dependency on 'com.google.gms' based on the position of the know 'com.android.tools.build' dependency in the build.gradle
 */
function addDependencies(buildGradle, context) {

  // find the known line to match
  var match = buildGradle.match(/^(\s*)classpath ["']com.android.tools.build(.*)/m);
  var whitespace = match[1];
  
  // modify the line to add the necessary dependencies
  var googlePlayDependency = whitespace + 'classpath \'com.google.gms:google-services:4.3.3\' // google-services dependency from cordova-plugin-firebase';
  var crashlyticsDependency = whitespace + 'classpath \'com.google.firebase:firebase-crashlytics-gradle:2.3.0\' // firebase crashlytics dependency from cordova-plugin-firebase';

  var modifiedLine = match[0] + '\n' + googlePlayDependency + '\n' + crashlyticsDependency;
  
  // modify the actual line
  return buildGradle.replace(/^(\s*)classpath ["']com.android.tools.build(.*)/m, modifiedLine);
}

/*
 * Add 'google()' and Crashlytics to the repository repo list
 */
function addRepos(buildGradle) {
  // find the known line to match
  var match = buildGradle.match(/^(\s*)repositories repos/m);
  var whitespace = match[1];

  // update the all projects grouping
  var allProjectsIndex = buildGradle.indexOf('allprojects');
  if (allProjectsIndex > 0) {
    // split the string on allprojects because jcenter is in both groups and we need to modify the 2nd instance
    var firstHalfOfFile = buildGradle.substring(0, allProjectsIndex);
    var secondHalfOfFile = buildGradle.substring(allProjectsIndex);

    // Add google() to the allprojects section of the string
    match = secondHalfOfFile.match(/^(\s*)repositories repos/m);
    var googlesMavenRepo = whitespace + 'repositories { google() } // Google\'s Maven repository from cordova-plugin-firebase';
    modifiedLine = match[0] + '\n' + googlesMavenRepo;
    // modify the part of the string that is after 'allprojects'
    secondHalfOfFile = secondHalfOfFile.replace(/^(\s*)repositories repos/m, modifiedLine);

    // recombine the modified line
    buildGradle = firstHalfOfFile + secondHalfOfFile;
  } else {
    // this should not happen, but if it does, we should try to add the dependency to the buildscript
    match = buildGradle.match(/^(\s*)repositories repos/m);
    var googlesMavenRepo = whitespace + 'repositories { google() } // Google\'s Maven repository from cordova-plugin-firebase';
    modifiedLine = match[0] + '\n' + googlesMavenRepo;
    // modify the part of the string that is after 'allprojects'
    buildGradle = buildGradle.replace(/^(\s*)repositories repos/m, modifiedLine);
  }

  return buildGradle;
}

/*
 * Helper function to write to the build.gradle that sits at the root of the project
 */
function writeRootBuildGradle(contents) {
  var target = path.join("platforms", "android", "build.gradle");
  fs.writeFileSync(target, contents);
}

module.exports = {

  modifyRootBuildGradle: function(context) {
    // be defensive and don't crash if the file doesn't exist
    if (!rootBuildGradleExists) {
      return;
    }

    var buildGradle = readRootBuildGradle();

    // Add Google Play Services Dependency
    buildGradle = addDependencies(buildGradle, context);
  
    // Add Google's Maven Repo
    buildGradle = addRepos(buildGradle);

    writeRootBuildGradle(buildGradle);
  },

  restoreRootBuildGradle: function() {
    // be defensive and don't crash if the file doesn't exist
    if (!rootBuildGradleExists) {
      return;
    }

    var buildGradle = readRootBuildGradle();

    // remove any lines we added
    buildGradle = buildGradle.replace(/(?:^|\r?\n)(.*)cordova-plugin-firebase*?(?=$|\r?\n)/g, '');
  
    writeRootBuildGradle(buildGradle);
  }
};