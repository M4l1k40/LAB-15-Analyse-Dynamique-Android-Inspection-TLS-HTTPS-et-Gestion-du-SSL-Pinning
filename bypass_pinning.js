Java.perform(function() {
    console.log("[*] Injection du bypass réseau global...");

    // Hook de URL.openConnection()
    var URL = Java.use('java.net.URL');
    URL.openConnection.overload().implementation = function() {
        var res = this.openConnection();
        console.log("[+] Connexion interceptée vers : " + this.toString());
        return res;
    };

    // Hook générique des TrustManagers (Bypass SSL universel)
    var TrustManagerFactory = Java.use('javax.net.ssl.TrustManagerFactory');
    TrustManagerFactory.getTrustManagers.implementation = function() {
        console.log("[+] [SSL] Bypass TrustManagerFactory.getTrustManagers()");
        return this.getTrustManagers();
    };
});