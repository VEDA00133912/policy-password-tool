const logElement = document.getElementById("log");
const outputTableBody = document.querySelector("#output-networks tbody");

const log = (message, isError = false) => {
  const p = document.createElement("div");
  p.textContent = message;
  if (isError) p.classList.add("error");
  logElement.appendChild(p);
};

const parseJSONSafely = (jsonStr) => {
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    log("無効なJSONです: " + e.message, true);
    return null;
  }
};

const extract = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.readAsText(file);

  reader.onload = (e) => {
    const netlog = e.target.result;
    const lines = netlog.split("\n");

    const keywords = [
      "ya0NvbmZpZ3VyYXRpb2",
      "vcmtDb25maWd1cmF0aW",
      "rQ29uZmlndXJhdGlvbn",
      "Db25maWd1cmF0aW9ucw"
    ];
    const policyLines = lines.filter(line =>
      keywords.some(keyword => line.includes(keyword))
    );

    if (policyLines.length === 0) {
      log("ポリシーのネットワーク設定が見つかりません", true);
      return;
    }

    logElement.textContent = "";
    outputTableBody.innerHTML = "";

    const fragment = document.createDocumentFragment();

    policyLines.forEach((line) => {
      try {
        const base64Match = line.match(/"bytes":"([^"]+)"/);
        if (!base64Match) throw new Error("base64文字列が見つかりません");

        const decoded = atob(base64Match[1]);
        const configMatch = decoded.match(/"NetworkConfigurations":\s*(\[.*?\])\s*[,}]/s);
        if (!configMatch) throw new Error("ネットワーク設定が見つかりません");

        const parsed = parseJSONSafely(`{"NetworkConfigurations":${configMatch[1]}}`);
        if (!parsed) return;

        parsed.NetworkConfigurations.forEach(net => {
          if (net.Type !== "WiFi") return;

          const ssid = net.WiFi?.SSID || "";
          const security = net.WiFi?.Security || "";
          let credentials = "NOT FOUND";

          if (net.WiFi?.Passphrase) {
            credentials = net.WiFi.Passphrase;
          } else if (security === "WPA-EAP" && net.WiFi?.EAP?.Password) {
            credentials = `Identity: ${net.WiFi.EAP.Identity}\nPassword: ${net.WiFi.EAP.Password}`;
          }

          const hidden = net.WiFi?.HiddenSSID ?? "";

          const row = document.createElement("tr");
          [ssid, credentials, security, hidden].forEach(text => {
            const td = document.createElement("td");
            td.textContent = text;
            row.appendChild(td);
          });

          fragment.appendChild(row);
        });
      } catch (err) {
        log("解析エラー: " + err.message, true);
      }
    });

    outputTableBody.appendChild(fragment);
  };

  reader.onerror = () => {
    log("ファイル読み込みに失敗しました。", true);
  };
};

document.getElementById("export").addEventListener("change", extract);