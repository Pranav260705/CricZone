var app = angular.module("CricketApp", []);

// Auth Service
app.service("AuthService", function() {
    this.isAuthenticated = function() {
        return !!localStorage.getItem('token');
    };

    this.getToken = function() {
        return localStorage.getItem('token');
    };

    this.getUser = function() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    };

    this.logout = function() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    };
});

// HTTP Interceptor for adding auth token
app.factory("AuthInterceptor", function(AuthService) {
    return {
        request: function(config) {
            const token = AuthService.getToken();
            if (token) {
                config.headers.Authorization = 'Bearer ' + token;
            }
            return config;
        }
    };
});

app.config(function($httpProvider) {
    $httpProvider.interceptors.push("AuthInterceptor");
});

// Auth Controller
app.controller("AuthController", function($scope, AuthService) {
    $scope.isAuthenticated = AuthService.isAuthenticated;
    $scope.getUser = AuthService.getUser;
    $scope.logout = AuthService.logout;
});

app.controller("CricketController", function ($scope, $http, AuthService) {
    $scope.players = [];

    // Check authentication
    if (!AuthService.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    // Load players from backend
    function loadPlayers() {
        $http.get("http://localhost:5000/players").then(function (response) {
            $scope.players = response.data;
        }).catch(function(error) {
            if (error.status === 401) {
                AuthService.logout();
            }
        });
    }

    // Open player profile in new window
    $scope.openPlayerProfile = function(player) {
        const playerId = player._id;
        const profileWindow = window.open(`player-profile.html?id=${playerId}`, 'PlayerProfile', 
            'width=900,height=700,menubar=no,toolbar=no,location=no,status=no');
    };

    // Delete player
    $scope.deletePlayer = function (id) {
        if (confirm("Are you sure you want to delete this player?")) {
            $http.delete(`http://localhost:5000/players/${id}`)
                .then(() => loadPlayers())
                .catch(function(error) {
                    if (error.status === 401) {
                        AuthService.logout();
                    }
                });
        }
    };

    // Load players initially
    loadPlayers();
});

// Player Profile Controller
app.controller("PlayerProfileController", function($scope, $http, $location, AuthService) {
    // Check authentication
    if (!AuthService.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    // Get player ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const playerId = urlParams.get('id');

    if (!playerId) {
        window.close();
        return;
    }

    // Fetch player details
    $http.get(`http://localhost:5000/players/${playerId}`)
        .then(function(response) {
            $scope.player = response.data;
        })
        .catch(function(error) {
            if (error.status === 401) {
                AuthService.logout();
            } else {
                alert("Error loading player profile!");
                window.close();
            }
        });
});

app.controller("AddPlayerController", function ($scope, $http, AuthService) {
    // Check authentication
    if (!AuthService.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    $scope.newPlayer = {};

    // Add new player
    $scope.addPlayer = function () {
        if (!$scope.newPlayer.name || !$scope.newPlayer.role || !$scope.newPlayer.runs || 
            !$scope.newPlayer.wickets || !$scope.newPlayer.matches || !$scope.newPlayer.team || 
            !$scope.newPlayer.nationality || !$scope.newPlayer.profileUrl) {
            alert("Please fill all fields before submitting!");
            return;
        }

        $http.post("http://localhost:5000/players", $scope.newPlayer)
            .then(function () {
                alert("Player added successfully!");
                $scope.newPlayer = {}; // Clear form fields instead of reloading page
                window.location.href = "index.html"; // Redirect to player list
            })
            .catch(function (error) {
                if (error.status === 401) {
                    AuthService.logout();
                } else {
                    alert("Error adding player! Check server logs.");
                    console.error(error);
                }
            });
    };
});
