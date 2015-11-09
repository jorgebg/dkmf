$(function() {
    var ref = new Firebase("https://myfav.firebaseio.com/favs");
    var authData = ref.getAuth();
    var tmdbApiKey = 'zeec3cc284594a8de664r27322fbjed2';
    var tmdbBaseUrl = 'https://api.themoviedb.org/3/';
    var imgUrl = 'https://image.tmdb.org/t/p/';
    var posterUrl = imgUrl + "w92/";
    var profileUrl = imgUrl + 'w45/';
    var defaultPosterUrl = 'holder.js/92x138'
    var defaultProfileUrl = 'holder.js/45x68'
    var $shows = $('section.shows');
    var shows = {};
    var template = Handlebars.compile($("#entry-template").html());

    $('.login-btn').on('click', function() {
        ref.authWithOAuthPopup("google", function(error, payload) {
            if (error) {
                console.log("Login Failed!", error);
            } else {
                authData = payload;
                run();
            }
        });
    });

    $('section.shows').on('click', '.like-btn', function() {
        var key = $(this).attr('data-favkey').split('/');
        like(key[0], key[1]);
    })

    var like = function(show, cast) {
        var snapshot = {};
        snapshot[authData.uid] = cast;
        ref.child(show).update(snapshot);
        console.log('Liking ' + show + '/' + cast);
    }

    var apiCall = function(path) {
        return $.getJSON(tmdbBaseUrl + path + '?timezone=Europe/Ireland&api_key=' + tmdbApiKey);
    }

    var setListeners = function(show_id) {
        ref.child(show_id).on("value", function(snapshot) {
            var key = snapshot.key();
            var users = snapshot.val();
            var chars = {};
            for(var user in users) {
                var char_id = users[user];
                if(chars[char_id]) {
                    chars[char_id]++;
                } else {
                    chars[char_id] = 1;
                }
            }

            for(var i in shows[show_id].cast) {
                var char = shows[show_id].cast[i];
                var value = chars[char.id] || 0;
                var favkey = show_id + '/' + char.id;
                var query = '[data-favkey="'+favkey+'"]';
                $('span'+query).html(value);
                if(users && users[authData.uid] == char.id) {
                    $('button'+query).html('Liked').addClass('disabled');
                } else {
                    $('button'+query).html('Like!').removeClass('disabled');
                }
            }
        });
    }

    var run = function() {
        console.log("Authenticated successfully with payload:", authData);
        $('.login-btn').hide();
        var showsList = [];
        apiCall('tv/airing_today').done(function(data) {
            var calls = [];
            for (var f in data.results) {
                var show = data.results[f];
                poster = show.poster_path ? posterUrl + show.poster_path : defaultPosterUrl;
                shows[show.id] = {
                    id: show.id,
                    name: show.name,
                    overview: show.overview,
                    popularity: show.popularity,
                    poster: poster,
                    cast: []
                }
                calls.push(apiCall('tv/' + show.id + '/credits'));
            };

            $.when.apply($, calls).done(function() {
                for(var i in arguments) {
                    var data = arguments[i][0];
                    var show = shows[data.id];
                    for(var c in data.cast) {
                        var cast = data.cast[c];
                        profile = cast.profile_path ? profileUrl + cast.profile_path : defaultProfileUrl;
                        favkey = data.id+'/'+cast.id;
                        show.cast.push({
                            id: cast.id,
                            character: cast.character,
                            profile: profile,
                            favkey: favkey,
                            n_favs: 0
                        });
                    }
                    showsList.push(show);
                }

                showsList = _.sortBy(showsList, function(o) {
                    return -o.popularity;
                });

                $shows.append(template({
                    shows: showsList
                }));
                Holder.run();
                for(var s in showsList) {
                    var show = showsList[s];
                    setListeners(show.id);
                }
            });
        });
    }


    if (authData) {
        run();
    }
});
