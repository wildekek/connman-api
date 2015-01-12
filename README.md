Connman-api
===============
Node.js Connman (Opensource connection manager) client. <br/>
Forked from [jsdx-connman](https://github.com/cfsghost/jsdx-connman). <br/>
Connman: http://www.connman.net/

Install
---
```$npm install```

Note on systems without X11
---
If no X server is running, the module fails when attempting to obtain 
a D-Bus connection at dbus._dbus.getBus(). This can be remedied by 
setting two environment variables manually (the actual bus address might be different):

``` javascript
process.env.DISPLAY = ':0';
process.env.DBUS_SESSION_BUS_ADDRESS = 'unix:path=/run/dbus/system_bus_socket';
```

License
---
Licensed under the MIT License

Authors
---
Copyright(c) 2014 Peter Uithoven <<peter@peteruithoven.nl>> @ Doodle3D <br/>
Copyright(c) 2012 Fred Chien <<fred@mandice.com>>

Copyright
---
Copyright(c) 2012 Mandice Company.
(http://www.mandice.com/)
