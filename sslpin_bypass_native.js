// sslpin_bypass_native.js

function hook(name, lib) {
    // On enveloppe l'exécution pour s'assurer que l'environnement natif est prêt
    Script.nextTick(function () {
        try {
            // Utilisation d'une alternative ultra-compatible pour trouver l'export
            var addr = null;
            
            if (typeof Module !== 'undefined' && Module.findExportByName) {
                addr = Module.findExportByName(lib ? lib : null, name);
            } else {
                // Alternative si 'Module' a un problème d'initialisation globale
                addr = Process.findModuleByName(lib).findExportByName(name);
            }

            if (!addr || addr.isNull()) {
                return console.log('[*] no ' + name);
            }

            Interceptor.attach(addr, {
                onLeave: function (rv) {
                    if (name === 'SSL_get_verify_result') {
                        console.log('[+] SSL_get_verify_result -> X509_V_OK');
                        rv.replace(ptr(0)); // 0 = X509_V_OK
                    }
                }
            });
            console.log('[+] Hooked ' + name);

        } catch (err) {
            console.log('[-] Erreur critique dans la fonction hook : ' + err.message);
        }
    });
}

// Appel standard requis par ton Lab
hook('SSL_get_verify_result', 'libssl.so');