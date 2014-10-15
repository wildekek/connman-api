//NOTE: Network.js DBUS needs environment vars below
//from: http://stackoverflow.com/questions/8556777/dbus-php-unable-to-launch-dbus-daemon-without-display-for-x11
process.env.DISPLAY = ':0';
process.env.DBUS_SESSION_BUS_ADDRESS = 'unix:path=/run/dbus/system_bus_socket';

var ConnMan = require('../');

var connman = new ConnMan();
connman.init(function() {

	connman.getServices(function(err, services) {
		for (var key in services) {
	      if (services.hasOwnProperty(key)) {
	      	//--for more see: https://git.kernel.org/cgit/network/connman/connman.git/tree/doc/service-api.txt
	      	console.log('name: ' + services[key].Name);
	      	console.log('service: ' + key);
	      	console.log('security: ' + services[key].Security);
	      	console.log('type: ' + services[key].Type);
	      	console.log('favorite: ' + services[key].Favorite);
	      	console.log('immutable: ' + services[key].Immutable);
	      	console.log('auto connect: ' + services[key].AutoConnect);
	      	console.log('\n');
	      }
	    }
	});
});
