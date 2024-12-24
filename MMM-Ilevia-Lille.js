/* Timetable for Lille local transport Module */

/* Module: MMM-Ilevia-Lille
*
* By Jérémy PALAFFRE (Jilano5) 
* based on a script from normyx (https://github.com/normyx/MMM-Nantes-TAN)
* MIT Licensed.
*/

Module.register("MMM-Ilevia-Lille",{
	
	
	// Define module defaults
	defaults: {
		updateInterval: 2 * 60 * 1000, //time in ms between pulling request for new times (update request)
		initialLoadDelay: 0, // start delay seconds.
		maxLettersForDestination: 20, //will limit the length of the destination string
		maxLettersForStop: 20, //will limit the length of the destination string
		showSecondsToNextUpdate: false,  // display a countdown to the next update pull (should I wait for a refresh before going ?)
		showLastUpdateTime: false,  //display the time when the last pulled occured (taste & color...)
		defaultIcon: 'bus',
		showNumber: true, // Bus number
		showIcon: true, // Bus icon in front of row
		useIleviaColor: true, //Use colors from ilevia database
		useColor: true,
		colorCode: {
			Blue: "rgb(0,121,188)",
			Green: "rgb(0, 118,125)",
			Yellow: "rgb(253,197,16)",
			Purple: "rgb(153,51,255)",
			White: "rgb(255,255,255)",
			Orange: "rgb(236,114,0)"	
		},
		size: "medium", // Text size, for example small, medium or large
		stacked: true, // Show multiple buses on same row, if same route and destination
		showTimeLimit: 45, // If not stacked, show time of departure instead of minutes, if more than this limit until departure.
		debug: false, //console.log more things to help debugging
		ileviaAPIURL: 'https://data.lillemetropole.fr/data/ogcapi/collections/ilevia%3Aprochains_passages/items?f=json',
		ileviaAPIURLColor: 'https://data.lillemetropole.fr/data/ogcapi/collections/ilevia%3Acouleurslignes/items?f=json'
	},
	

	// Define start sequence.
	start: function() {
		Log.info("Starting module: " + this.name);
		
		//Get Timezone
		this.config.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

		//Send data to Node JS
		this.sendSocketNotification('SET_CONFIG', this.config);
		
		//Get color for buses lines from Ilevia
		this.IleviaColor = []
		this.sendSocketNotification('GET_COLOR', this.config.busStations);
		
		this.busRecords = {};
		this.loaded = false;
		this.updateTimer = null;
		
		var self = this;
		setInterval(function () {
			self.caller = 'updateInterval';
			self.updateDom();
		}, this.config.updateInterval);
	},
	
	getTranslations: function () {
        return {
            en: "translations/en.json",
            fr: "translations/fr.json"
        };
    },
	
	getHeader: function () {
		var header = this.data.header;
		if (this.config.showSecondsToNextUpdate && typeof(this.config.lastUpdate) !== 'undefined') {
			var timeDifference = Math.round((this.config.updateInterval - new Date() + Date.parse(this.config.lastUpdate)) / 1000);
			if (timeDifference > 0) {
				header += ', ' + this.translate("NEXT_UPDATE_IN") + ' ' + timeDifference + ' s';
			} else {
				header += ', ' + this.translate("UPDATE_REQUESTED") + ' ' + Math.abs(timeDifference) + 's ago';
			}
		}
		if (this.config.showLastUpdateTime && typeof(this.config.lastUpdate) !== 'undefined') {
			var now = new Date(this.config.lastUpdate);
			header += (now ? (' @ ' + now.getHours() + ':' + (now.getMinutes() > 9 ? '' : '0') + now.getMinutes() + ':' + (now.getSeconds() > 9 ? '' : '0') + now.getSeconds()) : '');
		}
		return header;
	},
	
	setColor: function(element, codeColor) {
		if (this.config.useColor && codeColor != null) {
			var color = null;
			switch(codeColor) {
				case 'blue':
				color = this.config.colorCode.Blue;
				break;
				case 'green':
				color = this.config.colorCode.Green;
				break;
				case 'yellow':
				color = this.config.colorCode.Yellow;
				break;
				case 'purple':
				color = this.config.colorCode.Purple;
				break;
				case 'white':
				color = this.config.colorCode.White;
				break;
				case 'orange':
				color = this.config.colorCode.Orange;
				break;
				default :
				
			}
			if (color != null) {
				element.style="color:"+color+";";
			}			
		}
	},
	
	setIleviaColor: function(element, codeligne) {
		if (this.config.useColor) {
			var colorHEX = null;
			for (var index in this.IleviaColor) {
				if(this.IleviaColor[index].codeligne === codeligne){
					colorHEX = '#' + this.IleviaColor[index].colorHEX
					break;
				}
			}
			if (colorHEX != null) {
				element.style="color:"+colorHEX+";";
			}			
		}
	},
	
	stackBuses: function (buses) {
        stackedBuses = [];

        var len = buses.length;
        var previousStackvalue = '';
        var stackedTimes = [];
        if (len > 0) {
            previousStackvalue = '' + buses[0].nom_station + buses[0].code_ligne + buses[0].sens_ligne;
            stackedTimes.push(buses[0].heure_estimee_depart);
            for (var i = 1; i < len; i++) {
                stackvalue = '' + buses[i].nom_station + buses[i].code_ligne + buses[i].sens_ligne;
                if (stackvalue == previousStackvalue) {
                    stackedTimes.push(buses[i].heure_estimee_depart);
                } else {
                    stackedBuses.push({
                        from: buses[i - 1].nom_station,
                        number: buses[i - 1].code_ligne,
                        to: buses[i - 1].sens_ligne,
                        times: stackedTimes
                    });
                    previousStackvalue = stackvalue;
                    stackedTimes = [];
                    stackedTimes.push(buses[i].heure_estimee_depart)
                }
            }
            stackedBuses.push({
                from: buses[len - 1].nom_station,
                number: buses[len - 1].code_ligne,
                to: buses[len - 1].sens_ligne,
                times: stackedTimes
            });
        }
        return stackedBuses;
	},
	
	formatBuses: function (buses) {
        formatedBuses = [];

        var len = buses.length;
        if (len > 0) {
            for (var i = 0; i < len; i++) {
				formatedBuses.push({
					from: buses[i].nom_station,
					number: buses[i].code_ligne,
					to: buses[i].sens_ligne,
					time: buses[i].heure_estimee_depart
				});
			}
        }
        return formatedBuses;
    },
	
	// Override dom generator.
	getDom: function() {
		self = this;
        var wrapper = document.createElement("table");
        wrapper.className = "small";
        var first = true;

        if (!this.loaded) {
            wrapper.innerHTML = self.translate("LOADING");
            wrapper.className = "medium dimmed";
            return wrapper;
		}
		
		for (var busIndex = 0; busIndex < this.config.busStations.length; busIndex++) {
			
			var stop = this.config.busStations[busIndex];
			
			//#region Get stop index
			var stopIndex = ''
			if(typeof(stop.nomstation) !== 'undefined'){
				stopIndex += stop.nomstation + '_'
			}
			if(typeof(stop.codeligne) !== 'undefined'){
				stopIndex += stop.codeligne + '_'
			}
			if(typeof(stop.sensligne) !== 'undefined'){
				stopIndex += stop.sensligne
			}
			//#endregion
			
			var comingBuses = this.busRecords[stopIndex];
			
			if(self.config.debug){
				Log.info('MMM-Ilevia-Lille Debug : comingBuses')
				Log.info(comingBuses)
			}
			
			if(typeof(comingBuses) !== 'undefined'){
				comingBuses.forEach(function (bus) {
					//#region Get the next passage time
					var now = new Date();
					var minutes = '';
					if(self.config.stacked) {
						if(bus.times.length > 0) {
							var busTime = new Date(bus.times[0].replace('+00:00', ''));
							minutes = Math.round((busTime - now) / 60000);
							if(minutes <= 1 && minutes > 0){
								minutes = self.translate("CLOSE");
							}
							else if (minutes <= 0){
								minutes = ''	
							}
						}
						for(var i=1; i < bus.times.length; i++){
							var busTime = new Date(bus.times[i].replace('+00:00', ''));
							if(minutes == ''){
								minutes += Math.round((busTime - now) / 60000);
							}else{
								minutes += '/ ' + Math.round((busTime - now) / 60000);
							}
							
						}
						minutes += " min";
					} else {
						var busTime = new Date(bus.time.replace('+00:00', ''));
						minutes = Math.round((busTime - now) / 60000);
						if(minutes > self.config.showTimeLimit){
							minutes = busTime.getHours() + ':' + (busTime.getMinutes() < 10 ? '0' : '') + busTime.getMinutes();
						}else{
							minutes += " min";
						}
					}
					//#endregion
					
					var busWrapper = document.createElement("tr");
					busWrapper.className = first ? ' border_top' : '';
					first = false; // Top border only on the first row
		
					//Color
					if (self.config.useColor) {
						self.setColor(busWrapper,stop.color);
					}

					//Ilevia Color
					if (self.config.useIleviaColor) {
						self.setIleviaColor(busWrapper,bus.number);
					}					
					
					// Icon
					if (self.config.showIcon) {
						var iconWrapper = document.createElement("td");
						if (stop.icon != null) {
							iconWrapper.innerHTML = '<i class="fa fa-' + stop.icon + '" aria-hidden="true"></i>';
						} else {
							iconWrapper.innerHTML = '<i class="fa fa-' + self.config.defaultIcon + '" aria-hidden="true"></i>'; "fa fa-fw fa-"+self.config.defaultIcon;
						}
						iconWrapper.className = "align-right";
						busWrapper.appendChild(iconWrapper);
					}
					
					// Line number
					if (self.config.showNumber) {	
						var numberWrapper = document.createElement("td");
						numberWrapper.innerHTML = bus.number;
						numberWrapper.className = "align-right bold";
						busWrapper.appendChild(numberWrapper);
					}
					
					// Trip
					var tripWrapper = document.createElement("td");
					tripWrapper.className = "align-left";
					tripWrapper.innerHTML = self.capitalizeFirstLetter(bus.from.substr(0, self.config.maxLettersForStop).toLowerCase());
					if (comingBuses.length>0) {
						tripWrapper.innerHTML += " &rarr; " + self.capitalizeFirstLetter(bus.to.substr(0, self.config.maxLettersForDestination).toLowerCase());
					}
					busWrapper.appendChild(tripWrapper);
		
					// Passage Time
					var minutesWrapper = document.createElement("td");
					minutesWrapper.className = "align-right bright";
					minutesWrapper.innerHTML = minutes;
					busWrapper.appendChild(minutesWrapper);
		
					wrapper.appendChild(busWrapper);
				});	
			}
		}
		return wrapper;
	},
	
	socketNotificationReceived: function(notification, payload) {
		this.caller = notification;
		switch (notification) {
			case "BUS":
				if (payload.id != null) {
					this.busRecords[payload.id] = this.config.stacked ? this.stackBuses(payload.records) : this.formatBuses(payload.records);
					this.loaded = true;			
					this.updateDom();
					break;
				} else {
					Log.info(this.name + ': BUS - No payload');
				}	
			case "UPDATE":
				this.config.lastUpdate = payload.lastUpdate;
				this.updateDom();
				break;
			
			case "DEBUG":
				Log.info(payload);
				break;
				
			case "ILEVIA_COLOR":
				this.IleviaColor.push(payload)
				break;
		}
	},
	
	capitalizeFirstLetter: function (str) {
		var splitStr = str.toLowerCase().split(' ');
		for (var i = 0; i < splitStr.length; i++) {
			// You do not need to check if i is larger than splitStr length, as your for does that for you
			// Assign it back to the array
			splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);     
		}
		// Directly return the joined string
		return splitStr.join(' '); 
	}
});
