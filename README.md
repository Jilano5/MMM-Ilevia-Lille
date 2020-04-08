# MMM-Ilevia-Lille
This module is for viewing the Lille Bus and Tram Traffic Timetable, from given stops, given bus / tramway number, and direction.
It is based on the module developped by normyx : [MMM-Nantes-TAN](https://github.com/normyx/MMM-Nantes-TAN) and by ottopaulsen : [MMM-NesteBussAtB](https://github.com/ottopaulsen/MMM-NesteBussAtB) 
## Screenshot
![screenshot](https://github.com/Jilano5/MMM-Ilevia-Lille/blob/master/MMM-Ilevia-Lille.png)
## API
This module uses the opendata API provided by the MEL organization and Ilevia. Documentation may by found [here](https://opendata.lillemetropole.fr/explore/dataset/ilevia-prochainspassages/information/).

### API Key

You have to request an API Key on the MEL Opendata website by creating an account and generate a new API key [here](https://opendata.lillemetropole.fr/account/api-keys/). Indeed the limit of anonymous request is 1000 by day, that is too low for a refresh every minute. 

## Install
1. Clone the repository in the module directory :
```shell=
cd ~/MagicMirror/modules/
git clone https://github.com/Jilano5/MMM-Ilevia-Lille.git
```
2. Install the dependencies
```shell=
npm install
```

## Module Configuration
Add the module configuration in the `config/config.js` file :
```javascript=
        {
            module: 'MMM-Ilevia-Lille',
            position: 'bottom_right',
            header: 'Ilevia',
            config: {
            }
        },
```
The `config:` values are :

| Name | Default Value | Description |
| -------- | -------- | -------- |
| apiKey | 375...3d1 | See API key |
| updateInterval | 60000 ms *(1 mins)* | time in ms between pulling request for new times (update request) |
| initialLoadDelay | 0 | start delay seconds. |
| maxLettersForDestination | 12 | will limit the length of the destination string |
| maxLettersForStop | 12 | will limit the length of the stop string |
| showSecondsToNextUpdate | true | display a countdown to the next update pull (should I wait for a refresh before going ?) |
| showLastUpdateTime | false | display the time when the last pulled occured |
| showNumber | true | Display the number/name of the line |
| showIcon | true | Display the icon of the line |
| defaultIcon | bus | Default symbol that may be used in the font awesome library [here](https://fontawesome.com/icons?d=gallery&m=free) |
| useIleviaColor | true | Uses color of Ilevia API for lines (override useColor param) |
| useColor | true | Uses color set up in the lines configuration below |
| colorCode | Array | List of color available in RGB (ex : Blue: "rgb(0,121,188)"). Blue, Green, Yellow, Purple, White and Orange are available |
| size | medium | Text size, for example small, medium or large |
| stacked | true | Show multiple buses on same row, if same route and destination |
| showTimeLimit | 45 | If not stacked, show time of departure instead of minutes, if more than this limit until departure. |
| debug | false | `console.log` more things to help debugging |
| ileviaAPIURL | 'https://opendata.lillemetropole.fr/api/records/1.0/search/?dataset=ilevia-prochainspassages' | URI for the MEL Opendata API. No modification need, just in case evolutions |
| busStations | Array | See below |


The bus stations (`busStations:`) configuration are :

| Name | Mandatory | Description |
| -------- | -------- | -------- |
| nomstation | true | The stop shortname from where you want to leave. The name is found in the following request : [https://opendata.lillemetropole.fr/api/records/1.0/search/?dataset=ilevia-physicalstop&rows=5000&facet=cityname&facet=transportmoderef&facet=publiclinecode). For instance, `'BD DE MONS'` for BOULEVARD DE MONS stop. |
| codeligne | false | The line in the given stop you want to use.|
| sensligne | false | The destination of the line. For instance, `'EUROTELPORT'` for tram.|
| color | false | the color to use for this line. May be 'blue', 'green', 'purple', 'orange', 'white' or 'yellow'. If not set, default MagicMirror color will be used. |
| icon | false | Icon that may be used in the font awesome library [here](https://fontawesome.com/icons?d=gallery&m=free). If not set, the config `defaultIcon` will be used. Useally, the 'bus', 'subway' or 'train' may be used. |

You can test your nomstation, codeligne and sensligne parameters in the API helper of MEL API site [here](https://opendata.lillemetropole.fr/explore/dataset/ilevia-prochainspassages/api/?refine.nomstation=COLUCHE)

Here is an example:
```javascript=
        {
            module: 'MMM-Ilevia-Lille',
            position: 'bottom_center',
            header: 'Ilevia',
            config: {
                apiKey: '375...3d1',
                busStations: [
                    {nomstation:'LILLE FLANDRES', codeligne:'TRAM', sensligne:"EUROTELEPORT" , color:'blue', icon:'train'},
                    {nomstation:'WAGNER', codeligne:'CO1', sensligne:"HOTEL DE VILLE" , color:'green'}
                ],
            }
        },

```
