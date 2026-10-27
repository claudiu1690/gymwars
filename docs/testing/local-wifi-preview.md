# Local Wi-Fi preview

The current local review is available at **http://192.168.0.111:5200/** from a phone on the same Wi-Fi as the PC. Keep the PC awake and the preview running. Sign in with the account used on the Review 32 preview; browser login storage is separate between the LAN address and localhost.

## Runtime

- Bridge: `scripts/shareLocalPreview.cjs`, parent PID 11120.
- Listen address: `192.168.0.111:5200`, only the Wi-Fi interface.
- Allowed clients: `192.168.0.0/24`; foreign browser origins and unexpected Host headers are rejected.
- Target: existing `http://127.0.0.1:5199/` (Review 32). It shares that preview's existing save rather than copying or resetting accounts.
- Only web traffic is shared. The database and backend keep their loopback bindings. No router forwarding or firewall policy changes were made.
- Launch record and logs: `output/local-staging/design-review-32/wifi-launcher.json`, `wifi.log`, `wifi-errors.log`.

The bridge can be started again from the repository with:

```powershell
node scripts/shareLocalPreview.cjs --address 192.168.0.111 --port 5200 --target http://127.0.0.1:5199 --subnet 192.168.0.0/24
```

Use the PC's current Wi-Fi IPv4 address/subnet if its DHCP address changes. A guest network with device isolation can prevent phone-to-PC traffic even when both devices have internet access. Closing the bridge leaves the underlying preview/save intact.

## Browser compatibility

Browsers do not expose `crypto.randomUUID` on ordinary LAN HTTP origins. Career, Gym Wars, shop and feedback receipt IDs now share a UUID v4 helper using `crypto.getRandomValues` when the native UUID API is unavailable. This preserves random IDs and exact retry behavior without changing progression or rewards. The Review 32 frontend was rebuilt in place without removing its earlier asset files or restarting its database/server.

`tests/careerRequest.test.js` checks fallback UUID format/uniqueness and existing receipt recovery behavior. `tests/e2e/lan-preview.spec.cjs` exercises an actual private-IP HTTP origin against disposable test servers: fresh signup, training assignment without automatic advancement, End week, profile viewing, ranked 4v4 token use, and rejection of foreign Origin/Host headers. These tests use synthetic accounts and do not access the player's preview account.

Final verification: all three request/receipt tests and both mobile LAN browser tests passed. The frontend production build passed; the running Wi-Fi URL returned HTTP 200 and protected profile requests returned HTTP 401 without authentication. Browser log: `output/lan-preview-e2e.log`. Physical phone/router reachability still depends on the devices sharing the same Wi-Fi without client isolation.
