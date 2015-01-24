var metalsmith = require('metalsmith'),
    autoprefixer = require('metalsmith-autoprefixer'),
    branch = require('metalsmith-branch'),
    collections = require('metalsmith-collections'),
    excerpts = require('metalsmith-excerpts'),
    feed = require('metalsmith-feed'),
    gravatar = require('metalsmith-gravatar'),
    less = require('metalsmith-less'),
    lunr = require('metalsmith-lunr'),
    markdown = require('metalsmith-markdown'),
    metallic = require('metalsmith-metallic'),
    paginate = require('metalsmith-pagination'),
    permalinks = require('metalsmith-permalinks'),
    publish = require('metalsmith-publish'),
    serve = require('metalsmith-serve'),
    tags = require('metalsmith-tags'),
    templates = require('metalsmith-templates'),
    watch = require('metalsmith-watch'),
    wordcount = require('metalsmith-word-count');

var config;
try {
    config = require('./config.json');
} catch(e) {
    config = {
        "url":"http://localhost:8080",
        "title": "my website",
        "gravatarEmail": "asdf@asdf.com"
    };
}

metalsmith(__dirname)
    .metadata({
        site:{
            title: config.title,
            url: config.url
        }
    })
    .source('./bower_components')
    .destination('./build/lib')
    .build(function(err) {
        if (err) {
            console.log(err);
        }
        else {
            console.log('Bower build complete!');
        }
    });


metalsmith(__dirname)
    .metadata({
        site:{
            title: config.title,
            url: config.url
        }
    })
    .source('./src')
    .destination('./build')
    .use(publish({draft: false, private: false, future: false, futureMeta: 'date'}))
    .use(metallic())
    .use(markdown())
    .use(gravatar({myGravatar: config.gravatarEmail}))
    .use(excerpts())
    .use(collections({
        posts: {
            pattern: 'posts/**.html',
            sortBy: 'date',
            reverse: true
        }
    }))
    .use(branch('posts/**.html')
        .use(permalinks({
            pattern: 'posts/:title',
            relative: false
        }))
    )
    .use(branch('!posts/**.html')
        .use(branch('!index.md').use(permalinks({
            relative: false
        })))
    )
    //.use(tags({
    //    handle: 'tags',
    //    path: 'content/posts',
    //    template: '/templates/tag.jade',
    //    sortBy: 'date',
    //    reverse: true
    //}))
    //.use(paginate({
    //    'collections.posts': {
    //        perPage: 1,
    //        template: 'posts.jade',
    //        first: 'posts/index.html',
    //        path: 'posts/page/:num/index.html',
    //        pageMetadata: {
    //            title: 'Archive'
    //        }
    //}}))
    .use(wordcount({
        metaKeyCount: "wordCount",
        metaKeyReadingTime: "readingTime",
        speed: 300,
        seconds: false,
        raw: false
    }))
    .use(templates('jade'))
    .use(feed({collection: 'posts'}))
    .use(less())
    .use(autoprefixer())
    //.use(lunr(/*todo options*/))
    .use(serve({
        port: 8080,
        verbose: true
    }))
    .use(watch({
        pattern : '**/*',
        livereload: true
    }))
    .build(function(err) {
        if (err) {
            console.log(err);
        }
        else {
            console.log('Site build complete!');
        }
    });