var app = angular.module('ss-widget', ['monospaced.qrcode']);

app.factory('ss', function($http){
	var server = "https://shapeshift.io/"
	var server2 = "http://www2.shapeshift.io/";
	return {
		getCoins: function(callback) {
			$http.get(server + 'getcoins').success(callback);
		},
		getRate: function(callback) {
			$http.get(server2 + 'crowdsales').success(callback);
		},
		Store: function(data, callback) {
			$http.post(server2 + 'store', data).success(callback);
		},
		orderStat: function(deposit, callback) {
			$http.get(server2 + 'orderStat/' + deposit).success(callback);
		},
		sendAmount: function(data, callback) {
			$http.post(server + 'sendamount', data).success(callback);
		},
		txStat: function(deposit, callback) {
			$http.get(server + 'txStat/' + deposit).success(callback);
		}
	}	
	
});


app.controller('coinTrader', function($scope, $interval, ss){
	$scope.form = {};
	$scope.status = '';
	$scope.order = {};
	var promise;
	ss.getCoins(function(data){
		$scope.coins = data;
	});
	
	function getRate() {
		ss.getRate(function(data) {
			$scope.rate = data;
		})
	}
	getRate();
	$interval(getRate, 30000);
	$scope.form.coinIn = $scope.selectedCoin;
	$scope.getMarketData = function(coin) {
		$scope.selectedCoin = coin;
		$scope.form.coinIn = coin;
	}
	$scope.submit = function() {
		$scope.loading = true;
		$scope.progressText = 'Awaiting Deposit';
		$scope.progress = 0;
		ss.Store($scope.form, function(response) {
			console.log(response);
			if(response.success == true) {
				$scope.status = 'pending';
				$scope.order = response.order;
				var depositAddress = response.deposit;
				if($scope.form.coinIn == 'BTC') {
					$scope.deposit = response.deposit;
					$scope.QRcode = $scope.deposit + "?amount=" + $scope.form.amount;
					$scope.progress = 50;
					$scope.depositAmount = $scope.form.amount;
					function getStats() {
						ss.orderStat($scope.deposit, function(response){
							console.log(response);
							$scope.order = response;
							if(response.status == 'complete') {
								$interval.cancel(promise);
								$scope.progressText = 'Complete';
								$scope.status = 'complete';
								$scope.progress = 100;
								$scope.loading = false;
							}
						});
					}
					promise = $interval(getStats, 1000);
				} else {
					var altData = {
						"amount": $scope.form.amount,
						"withdrawal": depositAddress,
						"pair": $scope.form.coinIn + '_BTC',
						"reference": $scope.order
					}
					
					console.log(altData);
					ss.sendAmount(altData, function(response){
						if(response.success) {
							console.log(response);
							$scope.progress = 25;
							$scope.deposit = response.success.deposit;
							$scope.depositAmount = response.success.depositAmount;
							$scope.QRcode = $scope.coins[$scope.form.coinIn].name.toLowerCase() + ':' + $scope.deposit + "?amount=" + $scope.depositAmount;
							function getTX() {
								ss.txStat($scope.deposit, function(response){
									if(response.status == 'received') {
										$scope.progressText = 'Awaiting Exchange';
										$scope.progress = 50;
										
										$scope.loading = false;
									} else if(response.status == 'complete') {
										$interval.cancel(promise);
										$scope.status = 'complete';
										$scope.progressText = 'Complete';
										$scope.progress = 100;
									}
								});
							}
							promise = $interval(getTX, 1000);
						} else {
							alert(response.error);
						}
					});
				}
			} else {
				alert(response.error);
				$scope.loading = false;
			}
		});
	}
	
});