var should = require('should');
var gulp = require('gulp');
var through = require('through-gulp');
var fs = require('fs');
var path = require('path');
var utils = require('../utils/utils.js');

describe('utils module', function () {
  var StyleComment = '<!-- build:css /build/style/build.css --><link type="text/css" href="/style/origin.css"><!-- endbuild -->';
  var StyleMirrorComment = '<!-- build:css ./build/style/build.css --><link type="text/css" href="/style/origin.css"><!-- endbuild -->';
  var ScriptComment = '<!-- build:js /build/style/build.js --><script src="/script/origin.js></script><!-- endbuild -->';
  var LessComment = '<!-- build:less /build/style/build.css --><link type="text/css" href="/style/origin.less"><!-- endbuild -->';

  it('should merge object', function () {
    var source = {
      title: 'story',
      content: 'never say goodbye'
    };

    var destiny = {
      title: 'love'
    };

    (utils.shallowMerge(source, destiny)).should.eql({
      title: 'story',
      content: 'never say goodbye'
    })
  });

  it('should get js type', function () {
    utils.getBlockType(StyleComment).should.equal('css');
  });

  it('should get css type', function () {
    utils.getBlockType(ScriptComment).should.equal('js');
  });

  it('should get other type', function () {
    utils.getBlockType(LessComment).should.equal('less');
  });

  it('should get absolute destiny path', function () {
    utils.getBlockPath(StyleComment).should.equal('/build/style/build.css');
  });

  it('should get relative destiny path', function () {
    utils.getBlockPath(StyleMirrorComment).should.equal('./build/style/build.css');
  });

  it('should split html into blocks', function (done) {
    var expected = [
      '<!DOCTYPE html><html><head lang="en"><meta charset="UTF-8"><title>gulp release</title>',
      '<!-- build:css /build/style/build.css --><link rel="stylesheet" href="/style/origin.css"><link rel="stylesheet" href="/style/complex.css"><!-- endbuild -->',
      '<!-- build:js /build/script/build.js --><script src="/script/origin.js"></script><script src="/script/complex.js"></script><!-- endbuild -->',
      '</head><body></body></html>'
    ];
    gulp.src('./test/fixture/source.html')
      .pipe(through(function(file, enc, callback) {
        var result = utils.getSplitBlock(file.contents.toString());
        (utils._escape(result[0])).should.equal(utils._escape(expected[0]));
        (utils._escape(result[1])).should.equal(utils._escape(expected[1]));

        (utils._escape(result[2])).should.equal(utils._escape(expected[2]));
        (utils._escape(result[3])).should.equal(utils._escape(expected[3]));
        callback();
      }, function(callback) {
        callback();
        done();
      }))
  });

  it('should get file path from blocks', function (done) {
    gulp.src('./test/fixture/source.html')
      .pipe(through(function(file, enc, callback) {
        var blocks = utils.getSplitBlock(file.contents.toString());
        var result = utils.getFileSource(blocks);
        result[0].should.eql({
          type: 'css',
          destiny: '/build/style/build.css',
          files: ['/style/origin.css', '/style/complex.css']
        });

        result[1].should.eql({
          type: 'js',
          destiny: '/build/script/build.js',
          files: ['/script/origin.js', '/script/complex.js']
        });

        callback();
      }, function(callback) {
        callback();
        done();
      }))
  });

  it('should get file path from empty blocks', function (done) {
    gulp.src('./test/fixture/special.html')
      .pipe(through(function(file, enc, callback) {
        var blocks = utils.getSplitBlock(file.contents.toString());
        var result = utils.getFileSource(blocks);
        result[0].should.eql({
          type: 'css',
          destiny: '/build/style/build.css',
          files: []
        });

        result[1].should.eql({
          type: 'js',
          destiny: '/build/script/build.js',
          files: []
        });

        callback();
      }, function(callback) {
        callback();
        done();
      }))
  });

  it('should achieve path traverse when absolute style path', function (done) {
    function generateLess() {
      return through(function(file, enc, callback) {
        callback(null, file);
      });
    }

    var success = through(function(file, enc, callback) {
      file.contents.toString().should.equal("angular.module('cloud', []);");
      callback(null, file);
      done();
    });

    utils.pathTraverse(['/test/fixture/script/origin.js'], [{
      generator: generateLess,
      config: {}
    }]).pipe(success);
  });

  it('should achieve path traverse when relative style path', function (done) {
    function generateLess() {
      return through(function(file, enc, callback) {
        callback(null, file);
      });
    }

    var success = through(function(file, enc, callback) {
      file.contents.toString().should.equal("angular.module('cloud', []);");
      callback(null, file);
      done();
    });

    utils.pathTraverse(['./test/fixture/script/origin.js'], [{
      generator: generateLess,
      config: {}
    }]).pipe(success);
  });

  it('should resolve source into destiny', function (done) {
    gulp.src('./test/fixture/source.html')
      .pipe(through(function(file, enc, callback) {
        var expected =
          '<!DOCTYPE html><html><head lang="en"><meta charset="UTF-8"><title>gulp release</title>' +
          '<link rel="stylesheet" href="/build/style/build.css"/>' +
          '<script src="/build/script/build.js"></script>' +
          '</head><body></body></html>';

        var blocks = utils.getSplitBlock(file.contents.toString());
        var result = utils.resolveSourceToDestiny(blocks);
        (utils._escape(result)).should.equal(utils._escape(expected));
        callback();
      }, function(callback) {
        callback();
        done();
      }))
  });

  it('should resolve source files into destiny', function (done) {
    var sources = [
      {
        type: 'js',
        destiny: '/build/script/build.js',
        files: ['/test/fixture/script/origin.js', '/test/fixture/script/complex.js']
      },
      {
        type: 'css',
        destiny: '/build/style/build.css',
        files: ['/test/fixture/style/origin.css', '/test/fixture/style/complex.css']
      }
    ];

    var options = {
      js: [
        {
          generator: generateLess,
          config: {}
        }
      ],
      css: [
        {
          generator: generateLess,
          config: {}
        }
      ]
    };

    function generateLess() {
      return through(function(file, enc, callback) {
        callback(null, file);
      });
    }

    utils.resolveFileSource(sources, options);

    setTimeout(function() {
      var content;
      content = utils._escape(fs.readFileSync(path.join(process.cwd(), './build/script/build.js')).toString());
      content.should.equal(utils._escape("angular.module('cloud', []);angular.module('cloud').controller('MainCtrl', function() {});"));
      content = utils._escape(fs.readFileSync(path.join(process.cwd(), './build/style/build.css')).toString());
      content.should.equal(utils._escape("body { font-size: 16px; } body { overflow: hidden;}"));
      done();
    }, 100);
  });

  it('should concat separate file', function (done) {
    gulp.src(['./test/fixture/script/origin.js', './test/fixture/script/complex.js'])
      .pipe(utils.concat('build.js'))
      .pipe(through(function(file, enc, callback) {
        utils._escape(file.contents.toString()).should.equal(utils._escape("angular.module('cloud', []);angular.module('cloud').controller('MainCtrl', function() {});"));
        callback();
        done();
      }))
  });

  it('should resolve source into destiny when add tags', function (done) {
    gulp.src('./test/fixture/special.html')
      .pipe(through(function(file, enc, callback) {
        var expected =
          '<!DOCTYPE html><html><head lang="en"><meta charset="UTF-8"><title>gulp release</title>' +
          '<link rel="stylesheet" href="/build/style/build.css"/>' +
          '<script src="/build/script/build.js"></script>' +
          '</head><body></body></html>';

        var blocks = utils.getSplitBlock(file.contents.toString());
        var result = utils.resolveSourceToDestiny(blocks);
        (utils._escape(result)).should.equal(utils._escape(expected));
        callback();
      }, function(callback) {
        callback();
        done();
      }))
  });

  it('should resolve source into destiny when remove tags', function (done) {
    gulp.src('./test/fixture/special.html')
      .pipe(through(function(file, enc, callback) {
        var expected =
          '<!DOCTYPE html><html><head lang="en"><meta charset="UTF-8"><title>gulp release</title>' +
          '<link rel="stylesheet" href="/build/style/build.css"/>' +
          '<script src="/build/script/build.js"></script>' +
          '</head><body></body></html>';

        var blocks = utils.getSplitBlock(file.contents.toString());
        var result = utils.resolveSourceToDestiny(blocks);
        (utils._escape(result)).should.equal(utils._escape(expected));
        callback();
      }, function(callback) {
        callback();
        done();
      }))
  });
});