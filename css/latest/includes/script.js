let timerId = null; 
var lastCacheProgress = 0;
const label = document.getElementById('autoJbLabel');
const checkbox = document.getElementById('autoJbInput');
const jeilbrekBtn = document.getElementById('jeilbrek');
const UAElement = document.getElementById("UA");

const storedAutoJb = localStorage.getItem("autoJb");
let autoJbValue = storedAutoJb !== null ? storedAutoJb === "true" : true;

// Escolher uma das explorações do kernel
var exploitChain = localStorage.getItem("exploitChain") || "lapse";
const netctrlRadio = document.getElementById("netctrl-exploit");
const lapseRadio = document.getElementById("lapse-exploit");
const kexForm = document.getElementById('kernel-options');

// Exibir User Agent
if (UAElement) {
    UAElement.innerText += " " + navigator.userAgent;
}

if (kexForm) {
    kexForm.addEventListener("change", function (event) {
        localStorage.setItem("exploitChain", event.target.value);
        exploitChain = event.target.value;
    });
}

// Execução do Jailbreak
if (jeilbrekBtn) {
    jeilbrekBtn.addEventListener("click", function (e){
        jeilbrekBtn.disabled = true;
        stopInterval();
        doJb();
    });
}

// Botão de recarga protegido para recuperação após tentativa falhada
const reloadBtn = document.getElementById('reloadBtn');

if (reloadBtn) {
    reloadBtn.addEventListener("click", function () {
        stopInterval();
        window.location.reload();
    });
}

if (checkbox) {
    checkbox.addEventListener('change', function () {
        localStorage.setItem("autoJb", checkbox.checked);
        if (checkbox.checked == true && jeilbrekBtn && jeilbrekBtn.disabled == false) {
            startAutoJb();
            return;
        }

        stopInterval();
    });
}

function stopInterval(){
    if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
    }
    if (label) {
        label.textContent = "Auto Jailbreak";
    }
}

function jailbreakCountdown() {   
    stopInterval();

    let countdown = 5;
    if (label) label.textContent = `Auto Jailbreak em: ${countdown}`;
    
    timerId = setInterval(() => {
        countdown--;
        if (label) label.textContent = `Auto Jailbreak em: ${countdown}`;

        if (countdown < 0) {
            if (jeilbrekBtn) jeilbrekBtn.disabled = true; 
            clearInterval(timerId);
            timerId = null;
            if (label) label.textContent = 'Executando';
            doJb();
        }
    }, 1000);
}

// Ponto de entrada do início automático: inicia a contagem apenas com o cache estável
function startAutoJb() {
    if (jeilbrekBtn && jeilbrekBtn.disabled) return;
    var ac = window.applicationCache;
    var hasManifest = false;
    try { hasManifest = document.documentElement.hasAttribute("manifest"); } catch (e) { hasManifest = false; }
    if (!ac || !hasManifest) { jailbreakCountdown(); return; }

    var waitDone = false;
    var uncachedFallback = null;
    var progressWatchdog = null;
    var userTookOver = function () {
        return (jeilbrekBtn && jeilbrekBtn.disabled) || (checkbox && !checkbox.checked);
    };
    var stopProgressWatchdog = function () {
        if (progressWatchdog !== null) {
            clearInterval(progressWatchdog);
            progressWatchdog = null;
        }
    };

    var startProgressWatchdog = function () {
        if (progressWatchdog !== null) return;
        lastCacheProgress = Date.now();
        progressWatchdog = setInterval(function () {
            if (waitDone || userTookOver()) { stopProgressWatchdog(); return; }
            var cur = ac.status;
            if (cur === ac.IDLE || cur === ac.UPDATEREADY) { onCacheReady(); return; }
            if ((cur === ac.DOWNLOADING || cur === ac.CHECKING) && (Date.now() - lastCacheProgress > 45000)) {
                onCacheError();
            }
        }, 5000);
    };

    var detachWaiters = function () {
        stopProgressWatchdog();
        ac.removeEventListener('downloading', onLateDownload, false);
        ac.removeEventListener('cached', onCacheReady, false);
        ac.removeEventListener('updateready', onCacheReady, false);
        ac.removeEventListener('noupdate', onCacheReady, false);
        ac.removeEventListener('error', onCacheError, false);
    };

    var onCacheReady = function () {
        if (waitDone) return;
        waitDone = true;
        detachWaiters();
        clearTimeout(uncachedFallback);
        try { sessionStorage.removeItem('edugps4CacheRetries'); } catch (e) {}
        if (!userTookOver()) jailbreakCountdown();
    };

    var MAX_CACHE_RETRIES = 3;
    var getCacheRetries = function () {
        try { return parseInt(sessionStorage.getItem('edugps4CacheRetries') || '0', 10) || 0; }
        catch (e) { return MAX_CACHE_RETRIES; }
    };

    var onCacheError = function () {
        if (waitDone) return;
        waitDone = true;
        detachWaiters();
        clearTimeout(uncachedFallback);
        var retries = getCacheRetries();
        if (retries < MAX_CACHE_RETRIES) {
            if (label) label.textContent = 'Erro de cache - tentando novamente (' + (retries + 1) + '/' + MAX_CACHE_RETRIES + ')...';
            setTimeout(function () {
                try { sessionStorage.setItem('edugps4CacheRetries', String(retries + 1)); } catch (e) {}
                window.location.reload();
            }, 4000);
            return;
        }
        if (label) label.textContent = 'Erro de cache - clique em Jailbreak manualmente';
    };

    var onLateDownload = function () {
        ac.removeEventListener('downloading', onLateDownload, false);
        if (waitDone || userTookOver()) return;
        stopInterval();
        if (label) label.textContent = 'Atualização de cache encontrada... início automático pausado';
        ac.addEventListener('cached', onCacheReady, false);
        ac.addEventListener('updateready', onCacheReady, false);
        ac.addEventListener('noupdate', onCacheReady, false);
        ac.addEventListener('error', onCacheError, false);
        startProgressWatchdog();
    };

    var st = ac.status;
    if (st === ac.CHECKING || st === ac.DOWNLOADING || st === ac.UNCACHED) {
        if (label) {
            label.textContent = (st === ac.UNCACHED)
                ? 'Verificando cache offline...'
                : 'Instalando cache offline... início automático pausado';
        }
        ac.addEventListener('cached', onCacheReady, false);
        ac.addEventListener('updateready', onCacheReady, false);
        ac.addEventListener('noupdate', onCacheReady, false);
        ac.addEventListener('error', onCacheError, false);
        startProgressWatchdog();
        if (st === ac.UNCACHED) {
            uncachedFallback = setTimeout(function () {
                if (waitDone) return;
                try {
                    if (ac.status !== ac.UNCACHED) return;
                } catch (e) {}
                waitDone = true;
                detachWaiters();
                if (!userTookOver()) jailbreakCountdown();
            }, 8000);
        }
        return;
    }
    ac.addEventListener('downloading', onLateDownload, false);
    jailbreakCountdown();
}

function cacheProgress(e) {
    lastCacheProgress = Date.now();
    var Percent = (Math.round(e.loaded / e.total * 100));
    document.title = "Salvando em cache: " + Percent + "%";
}

function displayCacheProgress() {
    setTimeout(function () {
        document.title = "\u2713";
    }, 1000);
    setTimeout(function () {
        document.title = "EduGps4 Host";
    }, 3000);
}

document.addEventListener("DOMContentLoaded", function() {
    // Gestão de Cache
    if (window.applicationCache) {
        window.applicationCache.addEventListener("progress", cacheProgress, false);
        window.applicationCache.oncached = function (e) { displayCacheProgress(); };
        window.applicationCache.onupdateready = function (e) { displayCacheProgress(); };
    }

    // Selecionar cadeia de exploração preferida
    if (exploitChain == "netctrl") {
        if (netctrlRadio) netctrlRadio.checked = true;
    } else {
        if (lapseRadio) lapseRadio.checked = true;
    }

    // Aplicar valor de autojb do localStorage
    if (checkbox) checkbox.checked = autoJbValue;

    // O início automático aguarda o cache ficar estável
    if (autoJbValue) startAutoJb();
});let timerId = null; 
var lastCacheProgress = 0;
const label = document.getElementById('autoJbLabel');
const checkbox = document.getElementById('autoJbInput');
const jeilbrekBtn = document.getElementById('jeilbrek');
const UAElement = document.getElementById("UA");

const storedAutoJb = localStorage.getItem("autoJb");
let autoJbValue = storedAutoJb !== null ? storedAutoJb === "true" : true;

// Escolher uma das explorações do kernel
var exploitChain = localStorage.getItem("exploitChain") || "lapse";
const netctrlRadio = document.getElementById("netctrl-exploit");
const lapseRadio = document.getElementById("lapse-exploit");
const kexForm = document.getElementById('kernel-options');

// Exibir User Agent
if (UAElement) {
    UAElement.innerText += " " + navigator.userAgent;
}

if (kexForm) {
    kexForm.addEventListener("change", function (event) {
        localStorage.setItem("exploitChain", event.target.value);
        exploitChain = event.target.value;
    });
}

// Execução do Jailbreak
if (jeilbrekBtn) {
    jeilbrekBtn.addEventListener("click", function (e){
        jeilbrekBtn.disabled = true;
        stopInterval();
        doJb();
    });
}

// Botão de recarga protegido para recuperação após tentativa falhada
const reloadBtn = document.getElementById('reloadBtn');

if (reloadBtn) {
    reloadBtn.addEventListener("click", function () {
        stopInterval();
        window.location.reload();
    });
}

if (checkbox) {
    checkbox.addEventListener('change', function () {
        localStorage.setItem("autoJb", checkbox.checked);
        if (checkbox.checked == true && jeilbrekBtn && jeilbrekBtn.disabled == false) {
            startAutoJb();
            return;
        }

        stopInterval();
    });
}

function stopInterval(){
    if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
    }
    if (label) {
        label.textContent = "Auto Jailbreak";
    }
}

function jailbreakCountdown() {   
    stopInterval();

    let countdown = 5;
    if (label) label.textContent = `Auto Jailbreak em: ${countdown}`;
    
    timerId = setInterval(() => {
        countdown--;
        if (label) label.textContent = `Auto Jailbreak em: ${countdown}`;

        if (countdown < 0) {
            if (jeilbrekBtn) jeilbrekBtn.disabled = true; 
            clearInterval(timerId);
            timerId = null;
            if (label) label.textContent = 'Executando';
            doJb();
        }
    }, 1000);
}

// Ponto de entrada do início automático: inicia a contagem apenas com a cache estável
function startAutoJb() {
    if (jeilbrekBtn && jeilbrekBtn.disabled) return;
    var ac = window.applicationCache;
    var hasManifest = false;
    try { hasManifest = document.documentElement.hasAttribute("manifest"); } catch (e) { hasManifest = false; }
    if (!ac || !hasManifest) { jailbreakCountdown(); return; }

    var waitDone = false;
    var uncachedFallback = null;
    var progressWatchdog = null;
    var userTookOver = function () {
        return (jeilbrekBtn && jeilbrekBtn.disabled) || (checkbox && !checkbox.checked);
    };
    var stopProgressWatchdog = function () {
        if (progressWatchdog !== null) {
            clearInterval(progressWatchdog);
            progressWatchdog = null;
        }
    };

    var startProgressWatchdog = function () {
        if (progressWatchdog !== null) return;
        lastCacheProgress = Date.now();
        progressWatchdog = setInterval(function () {
            if (waitDone || userTookOver()) { stopProgressWatchdog(); return; }
            var cur = ac.status;
            if (cur === ac.IDLE || cur === ac.UPDATEREADY) { onCacheReady(); return; }
            if ((cur === ac.DOWNLOADING || cur === ac.CHECKING) && (Date.now() - lastCacheProgress > 45000)) {
                onCacheError();
            }
        }, 5000);
    };

    var detachWaiters = function () {
        stopProgressWatchdog();
        ac.removeEventListener('downloading', onLateDownload, false);
        ac.removeEventListener('cached', onCacheReady, false);
        ac.removeEventListener('updateready', onCacheReady, false);
        ac.removeEventListener('noupdate', onCacheReady, false);
        ac.removeEventListener('error', onCacheError, false);
    };

    var onCacheReady = function () {
        if (waitDone) return;
        waitDone = true;
        detachWaiters();
        clearTimeout(uncachedFallback);
        try { sessionStorage.removeItem('edugps4CacheRetries'); } catch (e) {}
        if (!userTookOver()) jailbreakCountdown();
    };

    var MAX_CACHE_RETRIES = 3;
    var getCacheRetries = function () {
        try { return parseInt(sessionStorage.getItem('edugps4CacheRetries') || '0', 10) || 0; }
        catch (e) { return MAX_CACHE_RETRIES; }
    };

    var onCacheError = function () {
        if (waitDone) return;
        waitDone = true;
        detachWaiters();
        clearTimeout(uncachedFallback);
        var retries = getCacheRetries();
        if (retries < MAX_CACHE_RETRIES) {
            if (label) label.textContent = 'Erro de cache - tentando novamente (' + (retries + 1) + '/' + MAX_CACHE_RETRIES + ')...';
            setTimeout(function () {
                try { sessionStorage.setItem('edugps4CacheRetries', String(retries + 1)); } catch (e) {}
                window.location.reload();
            }, 4000);
            return;
        }
        if (label) label.textContent = 'Erro de cache - clique em Jailbreak manualmente';
    };

    var onLateDownload = function () {
        ac.removeEventListener('downloading', onLateDownload, false);
        if (waitDone || userTookOver()) return;
        stopInterval();
        if (label) label.textContent = 'Atualização de cache encontrada... início automático pausado';
        ac.addEventListener('cached', onCacheReady, false);
        ac.addEventListener('updateready', onCacheReady, false);
        ac.addEventListener('noupdate', onCacheReady, false);
        ac.addEventListener('error', onCacheError, false);
        startProgressWatchdog();
    };

    var st = ac.status;
    if (st === ac.CHECKING || st === ac.DOWNLOADING || st === ac.UNCACHED) {
        if (label) {
            label.textContent = (st === ac.UNCACHED)
                ? 'Verificando cache offline...'
                : 'Instalando cache offline... início automático pausado';
        }
        ac.addEventListener('cached', onCacheReady, false);
        ac.addEventListener('updateready', onCacheReady, false);
        ac.addEventListener('noupdate', onCacheReady, false);
        ac.addEventListener('error', onCacheError, false);
        startProgressWatchdog();
        if (st === ac.UNCACHED) {
            uncachedFallback = setTimeout(function () {
                if (waitDone) return;
                try {
                    if (ac.status !== ac.UNCACHED) return;
                } catch (e) {}
                waitDone = true;
                detachWaiters();
                if (!userTookOver()) jailbreakCountdown();
            }, 8000);
        }
        return;
    }
    ac.addEventListener('downloading', onLateDownload, false);
    jailbreakCountdown();
}

function cacheProgress(e) {
    lastCacheProgress = Date.now();
    var Percent = (Math.round(e.loaded / e.total * 100));
    document.title = "Salvando em cache: " + Percent + "%";
}

function displayCacheProgress() {
    setTimeout(function () {
        document.title = "\u2713";
    }, 1000);
    setTimeout(function () {
        document.title = "EduGps4 Host";
    }, 3000);
}

document.addEventListener("DOMContentLoaded", function() {
    // Gestão de Cache
    if (window.applicationCache) {
        window.applicationCache.addEventListener("progress", cacheProgress, false);
        window.applicationCache.oncached = function (e) { displayCacheProgress(); };
        window.applicationCache.onupdateready = function (e) { displayCacheProgress(); };
    }

    // Selecionar cadeia de exploração preferida
    if (exploitChain == "netctrl") {
        if (netctrlRadio) netctrlRadio.checked = true;
    } else {
        if (lapseRadio) lapseRadio.checked = true;
    }

    // Aplicar valor de autojb do localStorage
    if (checkbox) checkbox.checked = autoJbValue;

    // O início automático aguarda a cache ficar estável
    if (autoJbValue) startAutoJb();
});
