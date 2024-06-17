/* Magic Mirror
* Module: MMM-Ilevia-Lille
*
* By Jérémy PALAFFRE (Jilano5) 
* based on a script from normyx (https://github.com/normyx/MMM-Nantes-TAN)
* MIT Licensed.
*/

const NodeHelper = require("node_helper");
const unirest = require('unirest');

module.exports = NodeHelper.create({
	start: function () {
		this.started = false;
		//this.lock = false;
	},

	socketNotificationReceived: function (notification, payload) {
		const self = this;
		
		if (notification === 'SET_CONFIG' && this.started == false) {
			this.config = payload;
			if (this.config.debug) {
				self.sendSocketNotification("DEBUG", this.name + ' Debug : config set in node_helper: ');
				self.sendSocketNotification("DEBUG", payload);
			}
			this.started = true;
			self.scheduleUpdate(this.config.initialLoadDelay);
		}
		
		if (notification === 'GET_COLOR') {
			var busStations = payload
			if (this.config.debug) {
				self.sendSocketNotification("DEBUG", this.name + ' Debug : get color in node_helper: ');
				self.sendSocketNotification("DEBUG", payload);
			}

			for (var index in busStations) {

				stopConfig = busStations[index];
				codeligne = stopConfig.codeligne
				
				var urlIleviaColor = self.config.ileviaAPIURLColor
				
				if(typeof(this.config.apiKey) !== 'undefined'){
					urlIleviaColor += '&apikey=' + encodeURI(this.config.apiKey)
				}
				if(typeof(codeligne) !== 'undefined'){
					urlIleviaColor += encodeURI("&filter=\"code_ligne\"='" + codeligne.toUpperCase() + "'")
				}

				self.getIleviaColor(
					urlIleviaColor
				);
				
			}
		}
	},

	/* scheduleUpdate()
	* Schedule next update.
	* argument delay number - Milliseconds before next update. If empty, this.config.updateInterval is used.
	*/
	scheduleUpdate: function (delay) {
		var self = this;
		
		var nextLoad = this.config.updateInterval;
		if (typeof delay !== "undefined" && delay >= 0) {
			nextLoad = delay;
		}
		
		if (this.config.debug) {
			self.sendSocketNotification("DEBUG", this.name + ' Debug : scheduleUpdate set next update in ' + nextLoad);
		}
		
		clearTimeout(this.updateTimer);		
		this.updateTimer = setTimeout(
			function () {
				self.updateTimetable();
			}, 
			nextLoad
		);
	},

	
	/* getResponse()
	* getResponse from the URL API
	* argument _url : URL to request
	* argument _processFunction : function to call after receiving response
	*/
	getResponse: function (_url, _processFunction, _stopConfig, _stopData) {
		var self = this;
		var retry = true;
		
		if (this.config.debug) {
			self.sendSocketNotification("DEBUG", this.name + ' Debug : fetching: ' + _url); 
		}
		unirest.get(_url)
			.header({
				'Accept': 'application/json;charset=utf-8'
			})
			.end(function (response) {
				if (response && response.body) {
					if (self.config.debug) {
						self.sendSocketNotification("DEBUG", this.name + ' Debug : received answer for: ' + _url);
					}
					_processFunction(response.body, _stopConfig, _stopData);
				} else {
					if (self.config.debug) {
						if (response) {
							self.sendSocketNotification("DEBUG", this.name + ' Debug : partial response received');
							self.sendSocketNotification("DEBUG", response);
						} else {
							self.sendSocketNotification("DEBUG", this.name + ' Debug : no response received');
						}
					}
				}
				
				if (retry) {
					self.scheduleUpdate((self.loaded) ? -1 : this.config.retryDelay);
				}
			})
	},
		
	getIleviaColor: function (_url) {
		var self = this;
		var retry = true;
		
		if (this.config.debug) {
			self.sendSocketNotification("DEBUG", this.name + ' Debug : fetching: ' + _url); 
		}
		unirest.get(_url)
			.header({
				'Accept': 'application/json;charset=utf-8'
			})
			.end(function (response) {
				if (response && response.body) {

					var data = response.body;

					if (self.config.debug) {
						self.sendSocketNotification("DEBUG", this.name + ' Debug : received answer for: ' + _url);
						self.sendSocketNotification("DEBUG", this.name + ' Debug : IleviaColor request response');
						self.sendSocketNotification("DEBUG", data);
					}

					var colorData = { 
						codeligne: data.records[0].properties.code_identifiant_public,
						colorHEX: data.records[0].properties.rgbhex_fond
					}

					self.sendSocketNotification("ILEVIA_COLOR", colorData);
							
				} else {
					if (self.config.debug) {
						if (response) {
							self.sendSocketNotification("DEBUG", this.name + ' Debug : partial response received');
							self.sendSocketNotification("DEBUG", response);
						} else {
							self.sendSocketNotification("DEBUG", this.name + ' Debug : no response received');
						}
					}
				}
			})
	},

	updateTimetable: function () {
		var self = this;
		var urlIlevia, urlArret, urlHoraire, stopConfig;
		
		if (this.config.debug) {
			self.sendSocketNotification("DEBUG", this.name + ' Debug : fetching update'); 
		}
		self.sendSocketNotification("UPDATE", { lastUpdate: new Date() });
		for (var index in self.config.busStations) {
			var stopData = {};
			stopConfig = self.config.busStations[index];
			
			urlIlevia = self.config.ileviaAPIURL
			
			if(typeof(self.config.apiKey) !== 'undefined'){
				urlIlevia += '&apikey=' + encodeURI(self.config.apiKey)
			}
			if(typeof(self.config.timezone) !== 'undefined'){
				urlIlevia += '&timezone=' + encodeURI(self.config.timezone)
			}

			filterElements = []

			if(typeof(stopConfig.nomstation) !== 'undefined'){
				filterElements.push('"nom_station"=\'' + stopConfig.nomstation.toUpperCase() + "'") 
			}
			if(typeof(stopConfig.codeligne) !== 'undefined'){
				filterElements.push('"code_ligne"=\'' + stopConfig.codeligne.toUpperCase() + "'") 
			}
			if(typeof(stopConfig.sensligne) !== 'undefined'){
				filterElements.push('"sens_ligne"=\'' + stopConfig.sensligne.toUpperCase() + "'") 
			}

			if(filterElements.length != 0){
				urlIlevia += encodeURI("&filter=" + filterElements.join(" AND "))
			}
			
			self.getResponse(
				urlIlevia,
				self.processStop.bind(this),
				stopConfig,
				stopData
			);
		}
	},
	
	processStop: function (data, stopConfig, stopData) {
		var self = this;
		
		if (this.config.debug) {
			self.sendSocketNotification("DEBUG", this.name + ' Debug : processStop request response');
			self.sendSocketNotification("DEBUG", data);
		}
		
		//set ID for the dataset
		stopData.id = ''
		if(typeof(stopConfig.nomstation) !== 'undefined'){
			stopData.id += stopConfig.nomstation + '_'
		}
		if(typeof(stopConfig.codeligne) !== 'undefined'){
			stopData.id += stopConfig.codeligne + '_'
		}
		if(typeof(stopConfig.sensligne) !== 'undefined'){
			stopData.id += stopConfig.sensligne
		}
		
		//Check si des résultats sont présent (mauvaise requète) pour l'affichage d'un message
		if(data.nbhits == 0)
		{
			stopData.noresult = true
		}else{
			stopData.noresult = false
		}

		stopData.records = data.records;
		
		this.loaded = true;
		this.sendSocketNotification("BUS", stopData);
	},
});
