<html>

	<head>

		<title>hastebin</title>

		<link rel="stylesheet" type="text/css" href="solarized_light.css"/>
		<link rel="stylesheet" type="text/css" href="application.css"/>

		<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js"></script>
		<script type="text/javascript" src="highlight.js"></script>
		<script type="text/javascript" src="application.js"></script>

		<meta name="robots" content="noindex,nofollow"/>

		<script type="text/javascript">
			var app = null;
			// Handle pops
			var handlePop = function(evt) {
				var path = evt.target.location.pathname;
				if (path === '/') { app.newDocument(true); }
				else { app.loadDocument(path.substring(path.lastIndexOf('/'), path.length)); }
			};
			// Set up the pop state to handle loads, skipping the first load
			// to make chrome behave like others:
			// http://code.google.com/p/chromium/issues/detail?id=63040
			setTimeout(function() {
				window.onpopstate = function(evt) {
					try { handlePop(evt); } catch(err) { /* not loaded yet */ }
				};
			}, 1000);
			// Construct app and load initial path
			$(function() {
				app = new haste('hastebin', { twitter: false });
				handlePop({ target: window });
			});
		</script>

	</head>

	<body>
		<ul id="messages"></ul>

		<table>
			<tr>
				<td/>
				<td>
					<div id="titlebox" style="display:none;">
						<input id='doctitle'/>
					</div>
				</td>
				<td>
					<div id="key">
						<div id="pointer" style="display:none;"></div>
						<div id="box2">
							<div class="save function"></div>
							<div class="new function"></div>
							<div class="duplicate function"></div>
							<div class="raw function"></div>
							<div class="twitter function"></div>
						</div>
					</div>
				</td>
			</tr>
			<tr>
				<td id="column1">
					<div id="linenos"></div>
				</td>
				<td id="column2">
					<pre id="box" style="display:none;" tabindex="0"><code></code></pre>
					<textarea spellcheck="false" style="display:none;"></textarea>
				</td>
				<td id="column3">
					<div id='documents'></div>
				</td>
			</tr>
		</table>
	</body>
</html>