///////////////////////////////////////////////////////////////////////////////
// loadgpx.x.js
//
// Javascript object to load GPX-format GPS data into Google Maps.
//
// History:
//	revision 1 - Initial implementation
//	revision 2 - Removed LoadGPXFileIntoGoogleMap and made it the callers
//				 responsibility.  Added more options (colour, width, delta).
//
// Author: Kaz Okuda
// URI: http://notions.okuda.ca/geotagging/projects-im-working-on/gpx-viewer/
//
///////////////////////////////////////////////////////////////////////////////

function GPXParser(xmlDoc, map)
{
	this.xmlDoc = xmlDoc;
	this.map = map;
	this.trackcolour = "#ff00ff"; // red
	this.trackwidth = 5;
	this.mintrackpointdelta = 0.0001
}

// Set the colour of the track line segements.
GPXParser.prototype.SetTrackColour = function(colour)
{
	this.trackcolour = colour;
}

// Set the width of the track line segements
GPXParser.prototype.SetTrackWidth = function(width)
{
	this.trackwidth = width;
}

// Set the minimum distance between trackpoints.
// Used to cull unneeded trackpoints from map.
GPXParser.prototype.SetMinTrackPointDelta = function(delta)
{
	this.mintrackpointdelta = delta;
}

GPXParser.prototype.TranslateName = function(name)
{
	if (name == "wpt")
	{
		return "Waypoint";
	}
	else if (name == "trkpt")
	{
		return "Track Point";
	}
}


GPXParser.prototype.CreateMarker = function(point)
{
	var lon = parseFloat(point.getAttribute("lon"));
	var lat = parseFloat(point.getAttribute("lat"));
	var html = "";

	if (point.getElementsByTagName("html").length > 0)
	{
		html = point.getElementsByTagName("html").item(0).xml;
	}
	else
	{
		// Create the html if it does not exist in the point.
		html = "<b>" + this.TranslateName(point.nodeName) + "</b><br>";
		var attributes = point.attributes;
		var attrlen = attributes.length;
		for (i=0; i<attrlen; i++)
		{
			html += attributes.item(0).name + " = " + attributes.item(i).text + "<br>";
		}

		if (point.hasChildNodes)
		{
			var children = point.childNodes;
			var childrenlen = children.length;
			for (i=0; i<childrenlen; i++)
			{
				html += children.item(i).nodeName + " = " + children.item(i).text + "<br>";
			}
		}
	}

	var marker = new GMarker(new GPoint(lon,lat));
	GEvent.addListener(marker, "click",
		function()
		{
			marker.openInfoWindowHtml(html);
		}
	);

	this.map.addOverlay(marker);
}


GPXParser.prototype.AddTrackSegmentToMap = function(trackSegment, colour, width)
{
	var trackpoints = trackSegment.getElementsByTagName("trkpt");
	if (trackpoints.length == 0)
	{
		return;
	}

	var pointarray = [];

	// process first point
	var lastlon = parseFloat(trackpoints[0].getAttribute("lon"));
	var lastlat = parseFloat(trackpoints[0].getAttribute("lat"));
	var bounds = new GBounds(lastlon,lastlat,lastlon,lastlat);
	pointarray.push(new GPoint(lastlon, lastlat));

	// Create a marker at the begining of each track segment
	//this.CreateMarker(trackpoints[0]);

	for (var i=1; i < trackpoints.length; i++)
	{
		var lon = parseFloat(trackpoints[i].getAttribute("lon"));
		var lat = parseFloat(trackpoints[i].getAttribute("lat"));

		// Verify that this is far enough away from the last point to be used.
		var latdiff = lat - lastlat;
		var londiff = lon - lastlon;
		if ( Math.sqrt(latdiff*latdiff + londiff*londiff) > this.mintrackpointdelta )
		{
			lastlon = lon;
			lastlat = lat;
			pointarray.push(new GPoint(lon, lat));
		}

	}

	var polyline = new GPolyline(pointarray, colour, width);

	// Can we make polylines clickable?
	GEvent.addListener(polyline, "click",
		function(overlay, point)
		{
			map.openInfoWindowHtml(point, "This is a test");
		}
	);

	this.map.addOverlay(polyline);
}

GPXParser.prototype.AddTrackToMap = function(track, colour, width)
{
	var segments = track.getElementsByTagName("trkseg");
	for (var i=0; i < segments.length; i++)
	{
		this.AddTrackSegmentToMap(segments[i], colour, width);
	}
}

GPXParser.prototype.CenterAndZoom = function (trackSegment)
{

	var pointlist = new Array("trkpt", "wpt", "photo");
	var minlat = 0;
	var maxlat = 0;
	var minlon = 0;
	var maxlon = 0;

	for (var pointtype=0; pointtype < pointlist.length; pointtype++)
	{
		// Center the map and zoom on the given segment.
		var trackpoints = trackSegment.getElementsByTagName(pointlist[pointtype]);

		// If the min and max are uninitialized then initialize them.
		if ( (trackpoints.length > 0) && (minlat == maxlat) && (minlat == 0) )
		{
			minlat = parseFloat(trackpoints[0].getAttribute("lat"));
			maxlat = parseFloat(trackpoints[0].getAttribute("lat"));
			minlon = parseFloat(trackpoints[0].getAttribute("lon"));
			maxlon = parseFloat(trackpoints[0].getAttribute("lon"));
		}

		for (var i=0; i < trackpoints.length; i++)
		{
			var lon = parseFloat(trackpoints[i].getAttribute("lon"));
			var lat = parseFloat(trackpoints[i].getAttribute("lat"));

			if (lon < minlon) minlon = lon;
			if (lon > maxlon) maxlon = lon;
			if (lat < minlat) minlat = lat;
			if (lat > maxlat) maxlat = lat;
		}
	}

	if ( (minlat == maxlat) && (minlat = 0) )
	{
		this.map.centerAndZoom(new GPoint(-49.282812, 123.122921), 4);
		return;
	}

	// Center around the middle of the points
	var centerlon = (maxlon + minlon) / 2;
	var centerlat = (maxlat + minlat) / 2;

	// Calculate the zoom from the lat/lon bounds.
	// From my rough calculations, it would seem that the bounds
	// at a particular zoom level are about 0.004 * 2^zoom.
	var width = maxlon - minlon;
	var height = maxlat - minlat;
	var maxbounds = width > height ? width : height;
	var zoom = Math.floor(Math.log(maxbounds / 0.003) * Math.LOG2E);

	this.map.centerAndZoom(new GPoint(centerlon, centerlat), zoom);
}

GPXParser.prototype.AddTrackpointsToMap = function ()
{
	var tracks = this.xmlDoc.documentElement.getElementsByTagName("trk");

	for (var i=0; i < tracks.length; i++)
	{
		this.AddTrackToMap(tracks[i], this.trackcolour, this.trackwidth);
	}
}

GPXParser.prototype.AddWaypointsToMap = function ()
{
	var waypoints = this.xmlDoc.documentElement.getElementsByTagName("wpt");

	for (var i=0; i < waypoints.length; i++)
	{
		this.CreateMarker(waypoints[i]);
	}
}

