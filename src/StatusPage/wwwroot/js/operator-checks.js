(() => {
    const checksApi = "/api/checks";
    const errorEl = document.getElementById("check-admin-error");
    const mutedEl = document.getElementById("check-admin-muted");

    function showError(message) {
        if (mutedEl) {
            mutedEl.hidden = true;
        }
        if (!errorEl) {
            window.alert(message);
            return;
        }
        errorEl.hidden = false;
        errorEl.textContent = message;
    }

    function showMuted(message) {
        if (errorEl) {
            errorEl.hidden = true;
        }
        if (!mutedEl) {
            window.alert(message);
            return;
        }
        mutedEl.hidden = false;
        mutedEl.textContent = message;
    }

    async function send(method, url, body) {
        const response = await fetch(url, {
            method,
            credentials: "same-origin",
            headers: body === undefined ? {} : { "Content-Type": "application/json" },
            body: body === undefined ? undefined : JSON.stringify(body)
        });
        if (response.status === 204) {
            return null;
        }
        let payload = null;
        try {
            payload = await response.json();
        } catch {
            payload = null;
        }
        if (response.status === 409) {
            const err = new Error((payload && payload.error) || "Check is muted.");
            err.name = payload && payload.parentDown ? "ParentDownError" : "MutedError";
            throw err;
        }
        if (!response.ok) {
            throw new Error((payload && payload.error) || response.statusText || "Request failed");
        }
        return payload;
    }

    function parseTarget(raw, type) {
        const value = (raw || "").trim();
        if (value.includes("://")) {
            return { url: value };
        }
        const colon = value.lastIndexOf(":");
        if (colon > 0 && type === "tcp") {
            const port = Number(value.slice(colon + 1));
            if (port >= 1 && port <= 65535) {
                return { host: value.slice(0, colon), port };
            }
        }
        return { host: value };
    }

    function parseStatuses(raw) {
        return (raw || "")
            .split(",")
            .map((part) => Number(part.trim()))
            .filter((code) => code >= 100 && code <= 599);
    }

    function formPayload(form) {
        const data = new FormData(form);
        const type = (data.get("type") || "https").toString();
        const statuses = parseStatuses((data.get("expectedStatus") || "").toString());
        const headers = {};
        const headerName = (data.get("headerName") || "").toString().trim();
        if (headerName) {
            headers[headerName] = (data.get("headerValue") || "").toString();
        }
        const dns = (data.get("dnsExpected") || "")
            .toString()
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean);
        const tlsDays = Number(data.get("tlsDays"));
        return {
            name: (data.get("name") || "").toString(),
            componentId: (data.get("componentId") || "").toString(),
            componentName: (data.get("componentName") || "").toString() || null,
            groupId: (data.get("groupId") || "").toString() || null,
            parentId: (data.get("parentId") || "").toString() || null,
            type,
            enabled: form.dataset.enabled !== "false",
            intervalSeconds: Number(data.get("intervalSeconds")) || 60,
            timeoutSeconds: Number(data.get("timeoutSeconds")) || 10,
            target: parseTarget((data.get("target") || "").toString(), type),
            http: {
                expectedStatus: statuses,
                bodyContains: (data.get("bodyContains") || "").toString() || null,
                jsonPath: (data.get("jsonPath") || "").toString() || null,
                expectedJsonValue: (data.get("expectedJsonValue") || "").toString() || null,
                headers: headerName ? headers : undefined
            },
            tls: Number.isFinite(tlsDays) && tlsDays > 0 ? { days: tlsDays } : undefined,
            dns: dns.length ? { expectedAddresses: dns } : undefined
        };
    }

    async function onAction(button) {
        const id = button.getAttribute("data-check-id");
        const action = button.getAttribute("data-check-action");
        if (!id || !action) {
            return;
        }
        try {
            if (action === "toggle") {
                const enabled = button.getAttribute("data-enabled") === "true";
                await send("PATCH", `${checksApi}/${id}`, { enabled });
            } else if (action === "run") {
                await send("POST", `${checksApi}/${id}/run`, {});
            } else if (action === "mute") {
                const from = document.querySelector(`[data-mute-from="${id}"]`);
                const until = document.querySelector(`[data-mute-until="${id}"]`);
                await send("PATCH", `${checksApi}/${id}`, {
                    mutedFrom: from && from.value.trim() ? from.value.trim() : null,
                    mutedUntil: until && until.value.trim() ? until.value.trim() : null
                });
            } else if (action === "clear-mute") {
                await send("PATCH", `${checksApi}/${id}`, { mutedFrom: null, mutedUntil: null });
            } else if (action === "delete") {
                await send("DELETE", `${checksApi}/${id}`);
            } else {
                return;
            }
            window.location = "/operator#checks";
        } catch (err) {
            if (err && (err.name === "MutedError" || err.name === "ParentDownError")) {
                showMuted(err.message || "Check is muted.");
                return;
            }
            showError(err.message || String(err));
        }
    }

    document.querySelectorAll("[data-check-action]").forEach((button) => {
        button.addEventListener("click", () => onAction(button));
    });

    const form = document.getElementById("check-admin-form");
    if (form) {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            try {
                const payload = formPayload(form);
                const id = form.getAttribute("data-check-id");
                if (id) {
                    await send("PUT", `${checksApi}/${id}`, payload);
                } else {
                    await send("POST", checksApi, payload);
                }
                window.location = "/operator#checks";
            } catch (err) {
                showError(err.message || String(err));
            }
        });
    }
})();
