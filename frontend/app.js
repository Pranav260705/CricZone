var app = angular.module("CricketApp", []);

app.controller("CricketController", function ($scope, $http) {
    $scope.players = [];

    // Load players from backend
    function loadPlayers() {
        $http.get("http://localhost:5000/players").then(function (response) {
            $scope.players = response.data;
        });
    }

    // Delete player
    $scope.deletePlayer = function (id) {
        if (confirm("Are you sure you want to delete this player?")) {
            $http.delete(`http://localhost:5000/players/${id}`).then(() => loadPlayers());
        }
    };

    // Load players initially
    loadPlayers();
});

app.controller("AddPlayerController", function ($scope, $http) {
    $scope.newPlayer = {};

    // Add new player
    $scope.addPlayer = function () {
        if (!$scope.newPlayer.name || !$scope.newPlayer.role || !$scope.newPlayer.runs || !$scope.newPlayer.matches || !$scope.newPlayer.profileUrl) {
            alert("Please fill all fields before submitting!");
            return;
        }

        $http.post("http://localhost:5000/players", $scope.newPlayer).then(function () {
            alert("Player added successfully!");
            $scope.newPlayer = {}; // Clear form fields instead of reloading page
            window.location.href = "index.html"; // Redirect to player list
        }).catch(function (error) {
            alert("Error adding player! Check server logs.");
            console.error(error);
        });
    };
});
