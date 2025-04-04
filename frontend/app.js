var app = angular.module("criczone", []);

// Update the API URL to use the same server
const API_URL = 'http://localhost:5000';

// Auth Service
app.service("AuthService", function($http) {
    var service = this;
    service.user = null;

    service.isAuthenticated = function() {
        return !!service.user;
    };

    service.getUser = function() {
        return service.user;
    };

    service.setUser = function(user) {
        console.log('Setting user:', user);
        service.user = user;
    };

    service.login = function(email, password) {
        console.log('Attempting login with:', email);
        return $http.post("http://localhost:5000/auth/login", { email, password }, { withCredentials: true })
            .then(response => {
                console.log('Login response:', response.data);
                if (response.data && response.data.user) {
                    service.setUser(response.data.user);
                    return response.data;
                } else {
                    throw new Error('Invalid response format');
                }
            })
            .catch(error => {
                console.error('Login error:', error);
                throw error;
            });
    };

    service.logout = function() {
        return $http.post("http://localhost:5000/auth/logout", {}, { withCredentials: true })
            .then(() => {
                service.user = null;
                window.location.href = 'login.html';
            })
            .catch(error => {
                console.error('Logout failed:', error);
                window.location.href = 'login.html';
            });
    };

    service.checkSession = function() {
        return $http.get("http://localhost:5000/auth/check-session", { withCredentials: true })
            .then(response => {
                console.log('Session check response:', response.data);
                if (response.data && response.data.user) {
                    service.setUser(response.data.user);
                    return service.user;
                } else {
                    throw new Error('Invalid session response');
                }
            })
            .catch(error => {
                console.error('Session check error:', error);
                service.user = null;
                throw error;
            });
    };
});

// HTTP Interceptor
app.factory("AuthInterceptor", function() {
    return {
        request: function(config) {
            config.withCredentials = true;
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

    // Check session on load
    AuthService.checkSession()
        .then(() => {
            // Only redirect to live-matches if we're on the login page
            if (window.location.pathname.includes('login.html')) {
                window.location.href = 'live-matches.html';
            }
        })
        .catch(() => {
            // Only redirect to login if we're not on the login page and not authenticated
            if (!window.location.pathname.includes('login.html') && !AuthService.isAuthenticated()) {
                window.location.href = 'login.html';
            }
        });
});

app.controller("CricketController", function ($scope, $http, AuthService) {
    $scope.players = [];

    // Check authentication and load players
    function initialize() {
        AuthService.checkSession()
            .then(() => {
                // User is authenticated, load players
                loadPlayers();
            })
            .catch(() => {
                // User is not authenticated, redirect to login
                window.location.href = 'login.html';
            });
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

    // Initialize the controller
    initialize();
});

// Player Profile Controller
app.controller("PlayerProfileController", function($scope, $http, $location, AuthService) {
    // Check authentication and load player profile
    function initialize() {
        AuthService.checkSession()
            .then(() => {
                // User is authenticated, load player profile
                loadPlayerProfile();
            })
            .catch(() => {
                // User is not authenticated, redirect to login
                window.location.href = 'login.html';
            });
    }

    // Get player ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const playerId = urlParams.get('id');

    if (!playerId) {
        window.close();
        return;
    }

    // Fetch player details
    function loadPlayerProfile() {
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
    }

    // Initialize the controller
    initialize();
});

app.controller("AddPlayerController", function ($scope, $http, AuthService) {
    // Check authentication and initialize form
    function initialize() {
        AuthService.checkSession()
            .then(() => {
                // User is authenticated, initialize form
                $scope.newPlayer = {};
            })
            .catch(() => {
                // User is not authenticated, redirect to login
                window.location.href = 'login.html';
            });
    }

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
                $scope.newPlayer = {}; // Clear form fields
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

    // Initialize the controller
    initialize();
});

// Login Controller
app.controller("LoginController", function($scope, AuthService) {
    $scope.login = function() {
        if (!$scope.email || !$scope.password) {
            alert("Please enter both email and password");
            return;
        }

        console.log('Login attempt started');
        AuthService.login($scope.email, $scope.password)
            .then(() => {
                console.log('Login successful, redirecting...');
                // Check if user is set before redirecting
                if (AuthService.isAuthenticated()) {
                    window.location.href = "live-matches.html";
                } else {
                    alert("Login successful but session not established");
                }
            })
            .catch(error => {
                console.error('Login failed:', error);
                alert(error.data?.error || "Login failed. Please try again.");
            });
    };

    // Check if already logged in
    AuthService.checkSession()
        .then(() => {
            console.log('Already logged in, redirecting...');
            window.location.href = "live-matches.html";
        })
        .catch(() => {
            console.log('Not logged in, showing login form');
        });
});

// Live Matches Service
app.service("LiveMatchesService", function($http) {
    var service = this;
    const API_KEY = '7fd9d9bf9amsh4fec798748ad712p13418fjsnbba51642c868';
    const API_HOST = 'cricket-live-line1.p.rapidapi.com';
    const IPL_SERIES_ID = 470;

    service.getLiveMatches = function() {
        return $http({
            method: 'GET',
            url: 'https://cricket-live-line1.p.rapidapi.com/liveMatches',
            headers: {
                'x-rapidapi-key': API_KEY,
                'x-rapidapi-host': API_HOST
            }
        }).then(function(response) {
            console.log('Raw live matches response:', response.data);
            // Filter for IPL matches only and handle the new data structure
            if (response.data && response.data.data) {
                const filteredMatches = response.data.data.filter(match => {
                    console.log('Checking match:', match);
                    return match.series_id === IPL_SERIES_ID;
                });
                console.log('Filtered live matches:', filteredMatches);
                return filteredMatches;
            }
            return [];
        });
    };

    service.getUpcomingMatches = function() {
        return $http({
            method: 'GET',
            url: 'https://cricket-live-line1.p.rapidapi.com/upcomingMatches',
            headers: {
                'x-rapidapi-key': API_KEY,
                'x-rapidapi-host': API_HOST
            }
        }).then(function(response) {
            console.log('Raw upcoming matches response:', response.data);
            // Filter for IPL matches only
            if (response.data && response.data.data) {
                const filteredMatches = response.data.data.filter(match => {
                    console.log('Checking match:', match);
                    return match.series_id === IPL_SERIES_ID;
                });
                console.log('Filtered upcoming matches:', filteredMatches);
                response.data.data = filteredMatches;
            }
            return response;
        });
    };
});

// Live Matches Controller
app.controller("LiveMatchesController", function($scope, LiveMatchesService, AuthService) {
    $scope.liveMatches = [];
    $scope.upcomingMatches = [];
    $scope.isAuthenticated = AuthService.isAuthenticated;
    $scope.getUser = AuthService.getUser;
    $scope.logout = AuthService.logout;

    // Check authentication and load matches
    function initialize() {
        AuthService.checkSession()
            .then(() => {
                // User is authenticated, load matches
                loadLiveMatches();
                loadUpcomingMatches();
            })
            .catch(() => {
                // User is not authenticated, redirect to login
                window.location.href = 'login.html';
            });
    }

    // Load live matches
    function loadLiveMatches() {
        LiveMatchesService.getLiveMatches()
            .then(function(matches) {
                console.log('Final live matches data:', matches);
                $scope.liveMatches = matches;
            })
            .catch(function(error) {
                console.error('Error loading live matches:', error);
                alert("Error loading live matches. Please try again later.");
            });
    }

    // Load upcoming matches
    function loadUpcomingMatches() {
        LiveMatchesService.getUpcomingMatches()
            .then(function(response) {
                console.log('Final upcoming matches data:', response.data);
                if (response.data && response.data.data) {
                    $scope.upcomingMatches = response.data.data;
                } else {
                    $scope.upcomingMatches = [];
                }
            })
            .catch(function(error) {
                console.error('Error loading upcoming matches:', error);
                alert("Error loading upcoming matches. Please try again later.");
            });
    }

    // Refresh matches every 5 minutes
    setInterval(function() {
        loadLiveMatches();
        loadUpcomingMatches();
    }, 300000);

    // Initialize the controller
    initialize();
});

// Points Table Controller
app.controller("PointsTableController", function($scope, $http) {
    $scope.teams = [];

    function loadPointsTable() {
        const settings = {
            url: 'https://cricket-live-line1.p.rapidapi.com/series/470/pointsTable',
            method: 'GET',
            headers: {
                'x-rapidapi-key': '7fd9d9bf9amsh4fec798748ad712p13418fjsnbba51642c868',
                'x-rapidapi-host': 'cricket-live-line1.p.rapidapi.com'
            }
        };

        $http(settings)
            .then(function(response) {
                if (response.data && response.data.data && response.data.data.A) {
                    // Sort teams by points (descending) and NRR (descending)
                    $scope.teams = response.data.data.A.sort(function(a, b) {
                        // Convert points to integers
                        const pointsA = parseInt(a.Pts);
                        const pointsB = parseInt(b.Pts);
                        
                        // Convert NRR to floating point numbers
                        const nrrA = parseFloat(a.NRR);
                        const nrrB = parseFloat(b.NRR);
                        
                        // First compare by points
                        if (pointsA > pointsB) {
                            // Team A has more points, so it should be ranked higher
                            return -1; // -1 means A comes before B
                        } else if (pointsA < pointsB) {
                            // Team B has more points, so it should be ranked higher
                            return 1; // 1 means B comes before A
                        } else {
                            // Points are equal, so compare by NRR
                            if (nrrA > nrrB) {
                                // Team A has higher NRR, so it should be ranked higher
                                return -1;
                            } else if (nrrA < nrrB) {
                                // Team B has higher NRR, so it should be ranked higher
                                return 1;
                            } else {
                                // Both points and NRR are equal
                                return 0; // 0 means they are equal in ranking
                            }
                        }
                    });
                }
            })
            .catch(function(error) {
                console.error('Error loading points table:', error);
            });
    }

    // Load points table on page load
    loadPointsTable();
});

// Profile Controller
app.controller("ProfileController", function($scope, AuthService) {
    $scope.user = null;
    $scope.isAuthenticated = AuthService.isAuthenticated;
    $scope.getUser = AuthService.getUser;
    $scope.logout = AuthService.logout;

    // Check authentication and load user data
    function initialize() {
        AuthService.checkSession()
            .then(() => {
                // User is authenticated, load user data
                $scope.user = AuthService.getUser();
            })
            .catch(() => {
                // User is not authenticated, redirect to login
                window.location.href = 'login.html';
            });
    }

    // Get team name based on team ID
    $scope.getTeamName = function(teamId) {
        const teamMap = {
            29: "Chennai Super Kings (CSK)",
            33: "Rajasthan Royals (RR)",
            28: "Royal Challengers Bengaluru (RCB)",
            154: "Gujarat Titans (GT)",
            31: "SunRisers Hyderabad (SRH)",
            155: "Lucknow Super Giants (LSG)",
            34: "Punjab Kings (PBKS)",
            30: "Delhi Capitals (DC)",
            27: "Mumbai Indians (MI)",
            32: "Kolkata Knight Riders (KKR)"
        };
        return teamMap[teamId] || "Unknown Team";
    };

    // Get team code based on team ID
    $scope.getTeamCode = function(teamId) {
        const teamCodeMap = {
            29: "csk",
            33: "rr",
            28: "rcb",
            154: "gt",
            31: "srh",
            155: "lsg",
            34: "pbks",
            30: "dc",
            27: "mi",
            32: "kkr"
        };
        return teamCodeMap[teamId] || "default";
    };

    // Get team logo URL based on team ID
    $scope.getTeamLogoUrl = function(teamId) {
        const teamLogoMap = {
            29: "https://documents.iplt20.com/ipl/CSK/logos/Logooutline/CSKoutline.png",
            33: "https://documents.iplt20.com/ipl/RR/Logos/Logooutline/RRoutline.png",
            28: "https://documents.iplt20.com/ipl/RCB/Logos/Logooutline/RCBoutline.png",
            154: "https://documents.iplt20.com/ipl/GT/Logos/Logooutline/GToutline.png",
            31: "https://documents.iplt20.com/ipl/SRH/Logos/Logooutline/SRHoutline.png",
            155: "https://documents.iplt20.com/ipl/LSG/Logos/Logooutline/LSGoutline.png",
            34: "https://documents.iplt20.com/ipl/PBKS/Logos/Logooutline/PBKSoutline.png",
            30: "https://documents.iplt20.com/ipl/DC/Logos/LogoOutline/DCoutline.png",
            27: "https://documents.iplt20.com/ipl/MI/Logos/Logooutline/MIoutline.png",
            32: "https://documents.iplt20.com/ipl/KKR/Logos/Logooutline/KKRoutline.png"
        };
        return teamLogoMap[teamId] || "https://documents.iplt20.com/ipl/CSK/logos/Logooutline/CSKoutline.png"; // Default to CSK logo if not found
    };

    // Initialize the controller
    initialize();
});

// Team Profile Controller
app.controller("TeamProfileController", function($scope, $http, $location, AuthService) {
    $scope.teamId = null;
    $scope.recentMatches = [];
    $scope.teams = [];
    $scope.isAuthenticated = AuthService.isAuthenticated;
    $scope.getUser = AuthService.getUser;
    $scope.logout = AuthService.logout;

    // Check authentication and load team data
    function initialize() {
        AuthService.checkSession()
            .then(() => {
                // User is authenticated, get team ID from URL or user's favorite team
                const urlParams = new URLSearchParams(window.location.search);
                const teamIdParam = urlParams.get('teamId');
                
                if (teamIdParam) {
                    // Team ID provided in URL
                    $scope.teamId = parseInt(teamIdParam);
                } else {
                    // Use user's favorite team
                    const user = AuthService.getUser();
                    $scope.teamId = user.favoriteTeam;
                }
                
                // Load team data
                loadRecentMatches();
                loadPointsTable();
            })
            .catch(() => {
                // User is not authenticated, redirect to login
                window.location.href = 'login.html';
            });
    }

    // Load recent matches for the team
    function loadRecentMatches() {
        const settings = {
            url: 'https://cricket-live-line1.p.rapidapi.com/recentMatches',
            method: 'GET',
            headers: {
                'x-rapidapi-key': '7fd9d9bf9amsh4fec798748ad712p13418fjsnbba51642c868',
                'x-rapidapi-host': 'cricket-live-line1.p.rapidapi.com'
            }
        };

        $http(settings)
            .then(function(response) {
                if (response.data && response.data.data) {
                    // Filter matches for the team
                    $scope.recentMatches = response.data.data.filter(match => 
                        match.team_a_id === $scope.teamId || match.team_b_id === $scope.teamId
                    );
                }
            })
            .catch(function(error) {
                console.error('Error loading recent matches:', error);
            });
    }

    // Load points table
    function loadPointsTable() {
        const settings = {
            url: 'https://cricket-live-line1.p.rapidapi.com/series/470/pointsTable',
            method: 'GET',
            headers: {
                'x-rapidapi-key': '7fd9d9bf9amsh4fec798748ad712p13418fjsnbba51642c868',
                'x-rapidapi-host': 'cricket-live-line1.p.rapidapi.com'
            }
        };

        $http(settings)
            .then(function(response) {
                if (response.data && response.data.data && response.data.data.A) {
                    // Sort teams by points (descending) and NRR (descending)
                    $scope.teams = response.data.data.A.sort(function(a, b) {
                        // Convert points to integers
                        const pointsA = parseInt(a.Pts);
                        const pointsB = parseInt(b.Pts);
                        
                        // Convert NRR to floating point numbers
                        const nrrA = parseFloat(a.NRR);
                        const nrrB = parseFloat(b.NRR);
                        
                        // First compare by points
                        if (pointsA > pointsB) {
                            // Team A has more points, so it should be ranked higher
                            return -1; // -1 means A comes before B
                        } else if (pointsA < pointsB) {
                            // Team B has more points, so it should be ranked higher
                            return 1; // 1 means B comes before A
                        } else {
                            // Points are equal, so compare by NRR
                            if (nrrA > nrrB) {
                                // Team A has higher NRR, so it should be ranked higher
                                return -1;
                            } else if (nrrA < nrrB) {
                                // Team B has higher NRR, so it should be ranked higher
                                return 1;
                            } else {
                                // Both points and NRR are equal
                                return 0; // 0 means they are equal in ranking
                            }
                        }
                    });
                }
            })
            .catch(function(error) {
                console.error('Error loading points table:', error);
            });
    }

    // Get team name based on team ID
    $scope.getTeamName = function(teamId) {
        const teamMap = {
            29: "Chennai Super Kings (CSK)",
            33: "Rajasthan Royals (RR)",
            28: "Royal Challengers Bengaluru (RCB)",
            154: "Gujarat Titans (GT)",
            31: "SunRisers Hyderabad (SRH)",
            155: "Lucknow Super Giants (LSG)",
            34: "Punjab Kings (PBKS)",
            30: "Delhi Capitals (DC)",
            27: "Mumbai Indians (MI)",
            32: "Kolkata Knight Riders (KKR)"
        };
        return teamMap[teamId] || "Unknown Team";
    };

    // Get team logo URL based on team ID
    $scope.getTeamLogoUrl = function(teamId) {
        const teamLogoMap = {
            29: "https://documents.iplt20.com/ipl/CSK/logos/Logooutline/CSKoutline.png",
            33: "https://documents.iplt20.com/ipl/RR/Logos/Logooutline/RRoutline.png",
            28: "https://documents.iplt20.com/ipl/RCB/Logos/Logooutline/RCBoutline.png",
            154: "https://documents.iplt20.com/ipl/GT/Logos/Logooutline/GToutline.png",
            31: "https://documents.iplt20.com/ipl/SRH/Logos/Logooutline/SRHoutline.png",
            155: "https://documents.iplt20.com/ipl/LSG/Logos/Logooutline/LSGoutline.png",
            34: "https://documents.iplt20.com/ipl/PBKS/Logos/Logooutline/PBKSoutline.png",
            30: "https://documents.iplt20.com/ipl/DC/Logos/LogoOutline/DCoutline.png",
            27: "https://documents.iplt20.com/ipl/MI/Logos/Logooutline/MIoutline.png",
            32: "https://documents.iplt20.com/ipl/KKR/Logos/Logooutline/KKRoutline.png"
        };
        return teamLogoMap[teamId] || "https://documents.iplt20.com/ipl/CSK/logos/Logooutline/CSKoutline.png"; // Default to CSK logo if not found
    };

    // Initialize the controller
    initialize();
});
