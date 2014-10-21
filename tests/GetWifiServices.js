process.env.DISPLAY = ':0';
process.env.DBUS_SESSION_BUS_ADDRESS = 'unix:path=/run/dbus/system_bus_socket';

var ConnMan = require('../');

var connman = new ConnMan();
connman.init(function() {

	connman.getServices('wifi', function(err, services) {
		console.log(services);

		process.exit();
	});
});
