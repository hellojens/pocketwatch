(function() {
  'use strict';

  angular.module('application', [
    'ui.router',
    'ngAnimate',

    //foundation
    'foundation',
    'foundation.dynamicRouting',
    'foundation.dynamicRouting.animations',
    'youtube-embed',
    'videosharing-embed',
    'socialLogin',
    'angular-scroll-complete'
  ])
    .config(config)
    .config(function(socialProvider){
      socialProvider.setGoogleKey("1098062714451-atu23gidthdu6gcoo3n6ciug432sc4rq.apps.googleusercontent.com");
      socialProvider.setFbKey({appId: "185893945163328", apiVersion: "v2.7"});
    })
    .run(run)
    .controller('mainController', mainController)
    .filter('orderObjectBy', function() {
      return function(items, field, reverse) {
        var filtered = [];
        angular.forEach(items, function(item) {
          filtered.push(item);
        });
        filtered.sort(function (a, b) {
          return (a[field] > b[field] ? 1 : -1);
        });
        if(reverse) filtered.reverse();
        return filtered;
      }
    })
    .filter('unique', function() {
       return function(collection, keyname) {
          var output = [],
              keys = [];

          angular.forEach(collection, function(item) {
              var key = item[keyname];
              if(keys.indexOf(key) === -1) {
                  keys.push(key);
                  output.push(item);
              }
          });

          return output;
       };
    })

  ;


  config.$inject = ['$urlRouterProvider', '$locationProvider', '$httpProvider', 'socialProvider'];
  mainController.$inject = ['$scope', '$rootScope', '$stateParams', '$state', '$controller', '$http', 'youtubeEmbedUtils', '$q', '$timeout', '$interval'];

  function config($urlProvider, $locationProvider, $httpProvider, $q, $scope, $timeout, $interval, socialProvider) {

    $httpProvider.interceptors.push( [ function( ) {
      return {
        'request': function( config ) {
          config.headers = config.headers || {};

          if ( localStorage.getItem('userName') && localStorage.getItem('userToken') ) {
            config.headers.Authorization = 'Bearer ' + localStorage.getItem('userToken');
          }
          return config;
        }
      };
    } ] );

    $urlProvider.otherwise('/');
    $locationProvider.html5Mode({
      enabled:true,
      requireBase: true
    });
    $locationProvider.hashPrefix('!');

  }
  // Clean up localStorage $$hashkays
  function replacer(key, value) {
    if (key == '$$hashKey') {
      return undefined;
    }
    return value;
  }

  function mainController($scope, $rootScope, $stateParams, $state, $controller, $http, youtubeEmbedUtils, $q, $timeout, $interval) {

    $scope.selectedMenu = "";
    $scope.showSlideOut = function(seletedMenu) {
      $scope.selectedMenu = seletedMenu;
      $(".slideOut").addClass("show");
    }

    $scope.showMenuOverlay = function($event) {
      $scope.selectedMenu = "";
      $(".slideOut").removeClass("show");
      $(".menuOverlay").toggle();
      $(".menuOverlayBackDrop").toggle();
    }

    $scope.videoById = [];
    $scope.videoByUrl = [];

    setTimeout(function(){
      if( $('.playing a').hasClass("youtube.com") || $('.playing a').hasClass("youtu.be") || $('.playing a').hasClass("m.youtube.com") )  {
        $scope.videoById = $('.playing a').attr("id");
        $(".youtubePlayer").show();
      } else if ( $('.playing a').hasClass("vimeo.com") ){
        $scope.videoByUrl = $('.playing a').attr("id");
        $(".vimeoPlayer").show();

      }
      setTimeout(function() {
        $('.videoItem.playing').triggerHandler('click');
      }, 0);
    }, 1200);

    $scope.setNextVideo = function setNextVideo($index, combined) {
      $scope.nextVideo = $index;
    };
    $scope.setPrevVideo = function setPrevVideo(index, combined) {
      $scope.prevVideo = index;
    };
    $scope.setPlayingVideo = function setPlayingVideo(video) {
      $scope.playingVideo = video;
    };
    $scope.sendIndex = function(index, video){
      $scope.selectedVideo = index;
    }

    $scope.skipNav = function ($event, next, player) {

      if(next == true) {
        $('.videoItem.playing').removeClass('playing').closest('.videoItem').next().addClass('playing');
        if( $scope.nextVideo.id.indexOf("http") > -1 ) {
          // Init Vimeo Player
          $scope.videoByUrl = $scope.nextVideo.id;
          $scope.videoById = "WvO9w8FQOUk";
          $(".youtubePlayer").hide();
          $(".vimeoPlayer").show();
        } else {
          // Init Youtube Player
          $scope.videoById = $scope.nextVideo.id;
          $scope.videoByUrl = "http://vimeo.com/116910082";
          $(".youtubePlayer").show();
          $(".vimeoPlayer").hide();
        }
      } else {
        $('.videoItem.playing').removeClass('playing').closest('.videoItem').prev().addClass('playing');
        if( $scope.prevVideo.id.indexOf("http") > -1 ) {
          // Init Vimeo Player
          $scope.videoByUrl = $scope.prevVideo.id;
          $scope.videoById = "WvO9w8FQOUk";
          $(".youtubePlayer").hide();
          $(".vimeoPlayer").show();
        } else {
          // Init Youtube Player
          $scope.videoById = $scope.prevVideo.id;
          $scope.videoByUrl = "http://vimeo.com/116910082";
          $(".youtubePlayer").show();
          $(".vimeoPlayer").hide();
        }
      }

      setTimeout(function() {
        $('.videoItem.playing').triggerHandler('click');
      }, 0);

      var container = $('.streamWrapper'), scrollTo = $('.videoItem.playing .card');
      container.animate({
        scrollTop: scrollTo.offset().top - container.offset().top + container.scrollTop() - 68
      }, "slow", 'swing');
    }

    var clearInterval = false;

    $scope.$on('youtube.player.ended', function ($event, player) {
      // Skip to next on video ended
      var next = true;
      $scope.skipNav($event, next, player);
      clearInterval = false;
    });
    $scope.$on('youtube.player.ready', function ($event, player) {
      // play it again
      player.playVideo();
      clearInterval = false;
    });

    // ViewCounter
    $scope.$on('youtube.player.playing', function($event, player) {
      if ( $('.playing a').attr("name") != "" ){
        var timer;
        timer = $timeout(function() {
          var timeElapsed = player.getCurrentTime() / player.getDuration() * 100;
          if (timeElapsed.toFixed(0) > 5 && clearInterval == false) {
            var wpId = $('.playing a').attr("name");
            $http.get( apiHost + '/wp/v2/posts/' + wpId)
            .then( function(postResponse) {
              var currentViewCount = (parseInt(postResponse.data.excerpt.rendered.match(/\d+/)[0]));
              $scope.newViewCount = currentViewCount + 1;
              $scope.updateViewedByWithTags = { excerpt: JSON.stringify($scope.newViewCount, replacer) };
              $http.post( apiHost + '/wp/v2/posts/' + wpId, $scope.updateViewedByWithTags )
              .then( function(postData) {
                // console.log(postData)
              });
            });
            clearInterval = true;
            $timeout.cancel(timer);
          }
        }, 3000);
      }
    });


    $scope.clickToPlay = function ($event, video) {
      if($(event.target).closest('.videoItem').hasClass != "playing") {
        $('.videoItem').removeClass("playing");
        $(event.target).closest('.videoItem').addClass("playing");
      }
    }

    // Qucik filter In Stream
    $scope.selectedChannel = ""
    $scope.toggleSwitchChannel = function ($event) {
      $(".channelsListNav").toggleClass('show');
    }
    $scope.filterByChannel = function ($event, watching) {
      $scope.selectedChannel = watching.name
      $(".channelsListNav label.radioActive").removeClass('radioActive');
      $(event.target).addClass('radioActive');
      $(".channelsListNav").toggleClass('show');
    }

    $scope.filterByChannelAll = function () {
      $scope.selectedChannel = ""
      $(".channelsListNav label.radioActive").removeClass('radioActive');
      $(event.target).addClass('radioActive');
      $(".channelsListNav").toggleClass('show');
    }

    $scope.filterByReposts = function (userOrder) {
      $scope.selectedChannel = userOrder
    }

    $scope.filterByCurrentUser = function (userOrder) {
      $scope.selectedChannel = userOrder
    }

    // Order Buttons
    $scope.order = "timestamp";
    $scope.setOrder = function (order) {
      // $scope.selectedChannel = ""
      $scope.order = order;
    };


    var apiHost = 'http://pocketwatchit.com/wp-json';
    var wpToken = localStorage.getItem('userToken');
    var wpUserName = localStorage.getItem('userName');
    var wpUserNamePretty = localStorage.getItem('userNamePretty');

    $scope.currentUser = {
      userName: wpUserName,
      userNamePretty: wpUserNamePretty
    };

    // Login & auth
    var newUsername = "";
    var newPassword = "";
    $scope.signInInput = []
    var signInAction = function(newUsername, newPassword) {

      // Check if New User or Exsisting
      if(typeof newUsername != 'undefined') {
        var theUsername = newUsername;
        var thePassword = newPassword;
      } else {
        var theUsername = $scope.signInInput.username;
        var thePassword = $scope.signInInput.password;
      }
      // Get Auth
      $http.post( apiHost + '/jwt-auth/v1/token', {
        username: theUsername,
        password: thePassword
      })
      .then( function( response ) {

        var token = response.data.token
        var display_name = response.data.user_display_name
        var nice_name = response.data.user_nicename
        var email = response.data.user_email

        // localStorage LoggedIn user
        localStorage.setItem("userName",nice_name);
        localStorage.setItem("userNamePretty",display_name);
        localStorage.setItem("userToken",token);
        var config = { headers: {
            'Authorization': 'Bearer ' + wpToken
          }
        };

        window.location.reload();
      })
      .catch( function( error ) {
        $scope.validationMessage = error.data.message;
      });
    }

    // Create New User
    $scope.createUserInput = []
    var createNewUser = function() {

      // Get signup info
      var newUsername =  $scope.createUserInput.username;
      var newDisplayName = $scope.createUserInput.usernameDisplayName;
      var newEmail = $scope.createUserInput.email;
      var newPassword = $scope.createUserInput.password;

      var apiUserRegister = 'http://pocketwatchit.com/api'
      $http.get( apiUserRegister + '/get_nonce/?controller=user&method=register' )
      .then(function( response ){
        $scope.userNonce = response.data.nonce

        $http.post( apiUserRegister + '/user/register/?username=' + newUsername + '&email='+ newEmail +'&nonce=' + $scope.userNonce +'&display_name=' + newDisplayName +'&user_pass='+ newPassword +'&notify=both&insecure=cool' )
        .then(function( response ){
          $scope.newUserId = response.data.user_id
          // Sign New user Ind
          signInAction(newUsername, newPassword);

        }).catch(function( error ){
          signInAction();
          $scope.validationMessage = error.data.error;
        });

      });
    }

    // Google sign in
    $rootScope.$on('event:social-sign-in-success', function(event, userDetails){
      console.log(userDetails)
      $scope.signInInput.username = userDetails.name.split(' ').join('')
      $scope.signInInput.password = userDetails.uid
      $scope.createUserInput.username = userDetails.name.split(' ').join('')
      $scope.createUserInput.usernameDisplayName = userDetails.name
      $scope.createUserInput.email = userDetails.email
      $scope.createUserInput.password = userDetails.uid
      createNewUser();
    })

    // Sign Exsisting user in
    $scope.signIn = function ($event) {
      signInAction();
    }
    // Sign Exsisting user in
    $scope.createUser = function ($event) {
      createNewUser();
    }

    // Sign All Out
    $scope.signOut = function ($event) {
      localStorage.setItem("userName",'');
      localStorage.setItem("userNamePretty",'');
      localStorage.setItem("userToken",'');
      localStorage.removeItem("subscriptionList");
      window.location.reload();
    }

    $scope.youtubeAccessToken = "AIzaSyCiomeXeime3nD3hdBHxu-b0zLklmo6_Rg";

    $scope.redditVideos = [];
    $scope.ytvideos = []
    $scope.wpPosts = []

    $scope.ytChannelList = [];
    $scope.ytChannels = [];

    $scope.subredditList = [];

    $scope.wpSavedSubreddits = [];
    var wpUserId = "";
    var wpUserDescription = "";

    if ( localStorage.getItem('userName') && localStorage.getItem('userToken') ) {
      $http.get( apiHost + '/wp/v2/users/me?_envelope')
      .then( function(userResponse) {
        wpUserId = userResponse.data.body.id;
        wpUserDescription = userResponse.data.body.description;

        // if (typeof localStorage["subscriptionList"] !== "undefined") {
        //   console.log("locastorage fucked")
        //   $scope.subscriptionList = localStorage.getItem('subscriptionList') ?
        //                       JSON.parse(localStorage.getItem('subscriptionList')) : "";
        //   localStorage.setItem('subscriptionList', JSON.stringify($scope.subscriptionList, replacer));
        // } else {

          if (wpUserDescription === "") {
            $scope.subscriptionList = [];
            localStorage.setItem('subscriptionList', '');
          } else {
            $scope.subscriptionList = JSON.parse(wpUserDescription);
            localStorage.setItem('subscriptionList', JSON.stringify($scope.subscriptionList, replacer));
          }
        // }

        // GET ALL POSTS BY AUTHORS
        $http.get( apiHost + '/wp/v2/posts?per_page=100')
        .then( function(userPosts) {
          angular.forEach(userPosts.data, function(postData){

            var dateConverted = new Date(postData.date_gmt).getTime() / 1000
            var timeago = timeSince(dateConverted);

            // GET AUTHOR INFO
            $http.get( apiHost + '/wp/v2/users/' + postData.author)
            .then( function(userResponse) {
              $scope.ytChannelParams = {
                id: postData.title.rendered,
                key: $scope.youtubeAccessToken,
                part: 'snippet',
              }
              // GET VIDEO FROM YOUTUBE ID PROVIDED BY USER's POSTS
              $http({ method: 'GET', url: 'https://www.googleapis.com/youtube/v3/videos',
                transformRequest: function(data,headersGetter){
                  var headers = headersGetter();
                  delete headers['Authorization'];
                  return headers;
                },
                params: $scope.ytChannelParams,
                cache: false
              }).success(function(response){
                // GET VIEW COUNT FROM WP
                $scope.wpPostViews = postData.excerpt.rendered.match(/\d+/)[0]
                // GET AUTHOR NAME AND IMAGE FROM WP
                $scope.authorId = userResponse.data.slug;
                $scope.authorName = userResponse.data.name;
                $scope.authorImage = userResponse.data.avatar_urls[48]
                $scope.wpPosts.push({
                  host: "youtube userpost",
                  hostImage: $scope.authorImage,
                  id: response.items[0].id,
                  wpId: postData.id,
                  title: response.items[0].snippet.title,
                  timestampGmt: postData.date_gmt,
                  timestamp: dateConverted,
                  date: timeago,
                  rating: parseInt($scope.wpPostViews),
                  upvotes: "impression",
                  description: response.items[0].snippet.description,
                  thumbnail: response.items[0].snippet.thumbnails.high.url,
                  author: response.items[0].snippet.channelTitle,
                  wpUser: $scope.authorName,
                  authorId: $scope.authorId,
                  permalink: "https://www.youtube.com/watch?v=" + response.items[0].id
                })
              });
            });
          });
        });

        $scope.wpPosts

      })
      .catch( function( error ) {
        console.log( 'Error', error );
      });
    }



    //// SEARCH FOR YOUTUBE CHANNELS

    $scope.ytChannelSearch = []

    $scope.ytChannelList.search = function() {
      $scope.ytChannelSearch = [];
      $scope.ytChannelSeachParams = {
        maxResults: '15',
        key: $scope.youtubeAccessToken,
        part: 'id,snippet',
        q: $scope.ytChannelList.input,
        order: 'viewCount',
      }
      $scope.searchForYtChannels = $http({ method: 'GET', url: 'https://www.googleapis.com/youtube/v3/search',
        transformRequest: function(data,headersGetter){
          var headers = headersGetter();
          delete headers['Authorization'];
          return headers;
        },
        params: $scope.ytChannelSeachParams,
        cache: false
      }).success(function(data) {
        angular.forEach(data.items, function(searchResult){
          $scope.resultChannelId = searchResult.snippet.channelId;
          $scope.ytChannelDetailsParams = {
            key: $scope.youtubeAccessToken,
            part: 'id,snippet,contentDetails,statistics',
            id: $scope.resultChannelId
          }
          $scope.detailsAboutYtChannels = $http({ method: 'GET', url: 'https://www.googleapis.com/youtube/v3/channels',
            transformRequest: function(data,headersGetter){
              var headers = headersGetter();
              delete headers['Authorization'];
              return headers;
            },
            params: $scope.ytChannelDetailsParams,
            cache: false
          }).success(function(data) {
            var searchResult = data.items[0];
            if (searchResult.statistics.subscriberCount != 0 ) {
              $scope.ytChannelSearch.push({
                title: searchResult.snippet.title,
                channelId: searchResult.id,
                url: "https://www.youtube.com/channel/" + searchResult.id,
                display_name: searchResult.snippet.title,
                headerImageUrl: searchResult.snippet.thumbnails.default.url,
                publicDescription: searchResult.snippet.description,
                subscribers: parseInt(searchResult.statistics.subscriberCount),
              });
            }
          });
        });
      });
    }

    $scope.ytChannelList.add = function(display_name, channelId) {
      $scope.subscriptionList.push({ytId: channelId, name: display_name});
      localStorage.setItem('subscriptionList', JSON.stringify($scope.subscriptionList, replacer));
      // Updating subscriptionList
      $scope.updateSubscriptionList = { description: localStorage.getItem('subscriptionList') };
      $http.post( apiHost + '/wp/v2/users/' + wpUserId,  $scope.updateSubscriptionList )
      setTimeout(function() {
        $('.videoItem.playing').triggerHandler('click');
      }, 0);
    };
    $scope.ytChannelList.remove = function(index) {
      $scope.subscriptionList.splice(index, 1);
      localStorage.setItem('subscriptionList', JSON.stringify($scope.subscriptionList, replacer));
      // Updating subscriptionList
      $scope.updateSubscriptionList = { description: localStorage.getItem('subscriptionList') };
      $http.post( apiHost + '/wp/v2/users/' + wpUserId,  $scope.updateSubscriptionList )
    };

    /// SEARCH FOR SUBREDDITS

    $scope.subredditSearch = []
    $scope.subredditList.search = function() {
      $scope.subredditSearch = [];
      $http({method: 'GET', url: 'https://www.reddit.com/subreddits/search.json?q='+ $scope.subredditList.input +'&limit=30&sort=hot',
        transformRequest: function(data,headersGetter){
          var headers = headersGetter();
          delete headers['Authorization'];
          return headers;
        }
      }).success(function(data) {
        angular.forEach(data.data.children, function(searchResult, index){

          $http({method: 'GET', url: 'https://www.reddit.com/r/'+ searchResult.data.display_name +'/hot.json?callback=JSON_CALLBACK&limit=30',
            transformRequest: function(data,headersGetter){
              var headers = headersGetter();
              delete headers['Authorization'];
              return headers;
            }
          }).success(function(data) {
            var counter = 0;
            angular.forEach(data, function(value, index){
              angular.forEach(value.children, function(video, item){
                if(video.data.domain === "youtube.com" || video.data.domain === "youtu.be" || video.data.domain === "m.youtube.com" || video.data.domain === "vimeo.com") {
                 counter++;
                }
              });
            });

            // if(searchResult.data.over18 == true && counter != 0 ) {
            if(counter != 0 ) {
              $scope.subredditSearch.push({
                title: searchResult.data.title,
                url: searchResult.data.url,
                display_name: searchResult.data.display_name,
                headerImageUrl: searchResult.data.header_img,
                publicDescription: searchResult.data.public_description,
                subscribers: searchResult.data.subscribers,
                videoCount: counter
              });
            }
          });

        });
      }).catch( function( error ) {
        console.log( 'Error:', error.data.error );
        $scope.validationMessage = error.data.error;
      });
    };

    $scope.subredditList.add = function(display_name, url) {
      $scope.subscriptionList.push({srId: display_name, name: url});
      localStorage.setItem('subscriptionList', JSON.stringify($scope.subscriptionList, replacer));
      // Updating subscriptionList
      $scope.updateSubscriptionList = { description: localStorage.getItem('subscriptionList') };
      $http.post( apiHost + '/wp/v2/users/' + wpUserId,  $scope.updateSubscriptionList )
      setTimeout(function() {
        $('.videoItem.playing').triggerHandler('click');
      }, 0);
    };
    $scope.subredditList.remove = function(index) {
      $scope.subscriptionList.splice(index, 1);
      localStorage.setItem('subscriptionList', JSON.stringify($scope.subscriptionList, replacer));
      // Updating subscriptionList
      $scope.updateSubscriptionList = { description: localStorage.getItem('subscriptionList') };
      $http.post( apiHost + '/wp/v2/users/' + wpUserId,  $scope.updateSubscriptionList )
    };


    /// CREATE FEED

    $scope.$watchCollection('subscriptionList', function(scope) {
      $scope.redditVideos = []
      $scope.ytVideos = []
      angular.forEach($scope.subscriptionList, function(data, index){

        if(data.srId) {

          $http({method: 'GET', url: 'https://www.reddit.com/r/'+ data.srId +'/hot.json?callback=JSON_CALLBACK&limit=20',
            transformRequest: function(data,headersGetter){
              var headers = headersGetter();
              delete headers['Authorization'];
              return headers;
            }
          }).success(function(data) {

            angular.forEach(data, function(value, index){
              angular.forEach(value.children, function(video, item){

                if(video.data.domain === "youtube.com" || video.data.domain === "youtu.be" || video.data.domain === "m.youtube.com" || video.data.domain === "vimeo.com") {
                  var videoIdConverter = youtubeEmbedUtils.getIdFromURL(video.data.url);
                  var timeago = timeSince(video.data.created_utc);
                  if(timeago !== false) {
                    if(video.data.media == null) {
                      if(video.data.preview == undefined) {
                        $scope.thumbnailCheck = "http://pocketwatchit.com/wp-content/uploads/2016/07/tb_blue_404.png";
                      } else {
                        $scope.thumbnailCheck = video.data.preview.images[0].source.url
                      }
                    } else {
                      $scope.thumbnailCheck = video.data.media.oembed.thumbnail_url
                    }
                    if(video.data.ups !== 0) {
                      $scope.redditVideos.push({
                        host: video.data.domain,
                        hostImage: "http://bucksboardroom.com/wp-content/uploads/2015/04/20131209094736.png",
                        id: videoIdConverter,
                        title: video.data.title,
                        wpId: 0,
                        timestamp: video.data.created_utc,
                        date: timeago,
                        rating: video.data.ups,
                        upvotes: "upvote",
                        commentsCount: video.data.num_comments,
                        comments: "comment",
                        description: "",
                        thumbnail: $scope.thumbnailCheck,
                        author: "/r/" + video.data.subreddit,
                        authorId: "notByUser",
                        permalink: "http://reddit.com/" + video.data.permalink
                      });
                    }
                  }
                }
              });

            });
          });
        } // End if reddit videos
        if(data.ytId) {

          $scope.ytChannelVideosParams = {
            key: $scope.youtubeAccessToken,
            type: 'video',
            maxResults: '15',
            part: 'id,snippet',
            order: 'date',
            channelId: data.ytId
          }

          $http({ method: 'GET', url: 'https://www.googleapis.com/youtube/v3/search',
            transformRequest: function(data,headersGetter){
              var headers = headersGetter();
              delete headers['Authorization'];
              return headers;
            },
            params: $scope.ytChannelVideosParams,
            cache: false
          }).success(function(response) {
            angular.forEach(response.items, function(data){
              // Get YOUTUBE statistics
              $scope.ytChannelStatisticsParams = {
                key: $scope.youtubeAccessToken,
                type: 'video',
                maxResults: '15',
                part: 'id,snippet,contentDetails,statistics',
                id: data.id.videoId,
              }
              $http({ method: 'GET', url: 'https://www.googleapis.com/youtube/v3/videos',
                transformRequest: function(data,headersGetter){
                  var headers = headersGetter();
                  delete headers['Authorization'];
                  return headers;
                },
                params: $scope.ytChannelStatisticsParams,
                cache: false
              }).success(function(statisticsResponse) {
                angular.forEach(statisticsResponse.items, function(data){

                  var dateConverted = new Date(data.snippet.publishedAt).getTime() / 1000
                  var timeago = timeSince(dateConverted);

                  if(!timeago == false ) {
                    $scope.ytvideos.push({
                      host: "youtube, youtubeChannel",
                      hostImage: "https://cdn3.iconfinder.com/data/icons/leaf/256/youtube.png",
                      id: data.id,
                      title: data.snippet.title,
                      wpId: 0,
                      timestamp: dateConverted,
                      date: timeago,
                      rating: parseInt(data.statistics.viewCount),
                      upvotes: "view",
                      commentsCount: parseInt(data.statistics.commentCount),
                      comments: "comment",
                      description: data.snippet.description,
                      thumbnail: data.snippet.thumbnails.high.url,
                      author: data.snippet.channelTitle,
                      authorId: "notByUser",
                      permalink: "http://youtube.com/watch?v=" + data.id.videoId
                    });
                  }
                });
              });
            });
          });

        }; // end if youtube videos
      });
    });


    $scope.totalDisplayed = 100;
    // $scope.loadMore = function () {
    //   console.log("load")
    //  $scope.totalDisplayed += 20;
    // };
    //
    // $scope.loadMore();


    // TEMP VIMEO GET GET

    $scope.vimeoChannel = "Staffpicks";
    $scope.vimeoVideos = []
    $scope.vimeoAccessToken = "dc12ca450ea0e26c1b77ad76671b5bc1";
    $http({method: 'GET', url: 'https://api.vimeo.com/channels/'+ $scope.vimeoChannel +'/videos?access_token='+ $scope.vimeoAccessToken +'&filter_embeddable=true&per_page=20&sort=date',
      transformRequest: function(data,headersGetter){
        var headers = headersGetter();
        delete headers['Authorization'];
        return headers;
      },
    }).then(function(response){
      angular.forEach(response.data.data, function(data){
        // console.log(data)
        var dateConverted = new Date(data.created_time).getTime() / 1000
        var timeago = timeSince(dateConverted);

        $scope.vimeoVideos.push({
          host: "vimeo.com",
          hostImage: "http://socialsynchronizer.com/image/catalog/vimeologo.jpg",
          id: data.resource_key,
          title: data.name,
          timestamp: dateConverted,
          date: timeago,
          description: data.description,
          thumbnail: data.pictures.sizes[3].link,
          author: $scope.vimeoChannel,
          permalink: data.link
        })

      });
    });

    $scope.vimeoVideos

    // $scope.ytChannelParams = {
    //   key: $scope.youtubeAccessToken,
    //   type: 'video',
    //   maxResults: '4',
    //   part: 'id,snippet',
    //   q: '',
    //   order: 'date',
    //   channelId: 'UCddiUEpeqJcYeBxX1IVBKvQ',
    // }
    //
    // $scope.ytChannelParams2 = {
    //   key: $scope.youtubeAccessToken,
    //   type: 'video',
    //   maxResults: '4',
    //   part: 'id,snippet',
    //   q: '',
    //   order: 'date',
    //   channelId: 'UCxD2E-bVoUbaVFL0Q3PvJTg',
    // }
    //
    // $scope.ytChannelParams3 = {
    //   key: $scope.youtubeAccessToken,
    //   type: 'video',
    //   maxResults: '4',
    //   part: 'id,snippet',
    //   q: '',
    //   order: 'date',
    //   channelId: 'UC2pmfLm7iq6Ov1UwYrWYkZA',
    // }
    //
    // $scope.chanelOne = $http({ method: 'GET', url: 'https://www.googleapis.com/youtube/v3/search',
    //   transformRequest: function(data,headersGetter){
    //     var headers = headersGetter();
    //     delete headers['Authorization'];
    //     return headers;
    //   },
    //   params: $scope.ytChannelParams,
    //   cache: false
    // });
    // $scope.channelTwo = $http({ method: 'GET', url: 'https://www.googleapis.com/youtube/v3/search',
    //   transformRequest: function(data,headersGetter){
    //     var headers = headersGetter();
    //     delete headers['Authorization'];
    //     return headers;
    //   },
    //   params: $scope.ytChannelParams2,
    //   cache: false
    // });
    // $scope.channelTree = $http({ method: 'GET', url: 'https://www.googleapis.com/youtube/v3/search',
    //   transformRequest: function(data,headersGetter){
    //     var headers = headersGetter();
    //     delete headers['Authorization'];
    //     return headers;
    //   },
    //   params: $scope.ytChannelParams3,
    //   cache: false
    // });


    // the verge channel id: UCpZ5qUqpW4hW4zdfuBxMSJA

    // $http.get('https://www.googleapis.com/youtube/v3/search',{
    //   params:$scope.ytChannelParams}).success(function(response){
    //   angular.forEach(response.items, function(data){
    //
    //     var dateConverted = new Date(data.snippet.publishedAt).getTime() / 1000
    //     var timeago = timeSince(dateConverted);
    //
    //     $scope.ytvideos.push({
    //       host: "youtube, youtubeChannel",
    //       hostImage: "https://cdn3.iconfinder.com/data/icons/leaf/256/youtube.png",
    //       id: data.id.videoId,
    //       title: data.snippet.title,
    //       timestamp: dateConverted,
    //       date: timeago,
    //       description: data.snippet.description,
    //       thumbnail: data.snippet.thumbnails.high.url,
    //       author: data.snippet.channelTitle
    //     })
    //
    //   });
    // });

    // $q.all([$scope.chanelOne, $scope.channelTwo, $scope.channelTree]).then(function(response) {
    //
    //   angular.forEach(response, function(splitResponse){
    //
    //     angular.forEach(splitResponse.data.items, function(data){
    //
    //       var dateConverted = new Date(data.snippet.publishedAt).getTime() / 1000
    //       var timeago = timeSince(dateConverted);
    //
    //       $scope.ytvideos.push({
    //         host: "youtube, youtubeChannel",
    //         hostImage: "https://cdn3.iconfinder.com/data/icons/leaf/256/youtube.png",
    //         id: data.id.videoId,
    //         title: data.snippet.title,
    //         timestamp: dateConverted,
    //         date: timeago,
    //         description: data.snippet.description,
    //         thumbnail: data.snippet.thumbnails.high.url,
    //         author: data.snippet.channelTitle
    //       })
    //
    //     });
    //   });
    //
    // });
    //
    // $scope.ytvideos

  }

  function run() {
    var tag = document.createElement('script');
    tag.src = "http://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    // FastClick.attach(document.body);
  }

})();



// TimeAge converter
function timeSince(date) {
  var seconds = Math.floor(((new Date().getTime()/1000) - date))

  var interval = Math.floor(seconds / 31536000);

  if (interval >= 1) {
    if(interval == 1) return false;
    // if(interval == 1) return interval + " year ago";
    else
      return false;
      // return interval + " years ago";
  }
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) {
    if(interval == 1) return false;
    // if(interval == 1) return interval + " month ago";
    else
      return false;
      // return interval + " months ago";
  }
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) {
    if(interval == 1) return interval + " day ago";
    else
      return interval + " days ago";
  }
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) {
    if(interval == 1) return interval + " hour ago";
    else
      return interval + " hours ago";
  }
  interval = Math.floor(seconds / 60);
  if (interval >= 1) {
    if(interval == 1) return interval + " minute ago";
    else
      return interval + " minutes ago";
  }
  return Math.floor(seconds) + " seconds ago";
}
