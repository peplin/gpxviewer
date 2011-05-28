///////////////////////////////////////////////////////////////////////////////
// loadgpx.4.js
//
// Javascript object to load GPX-format GPS data into Google Maps.
//
// Copyright (C) 2006 Kaz Okuda (http://notions.okuda.ca)
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License
// as published by the Free Software Foundation; either version 2
// of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
//
// If you use this script or have any questions please leave a comment
// at http://notions.okuda.ca/geotagging/projects-im-working-on/gpx-viewer/
// A link to the GPL license can also be found there.
//
///////////////////////////////////////////////////////////////////////////////
//
// History:
//    revision 1 - Initial implementation
//    revision 2 - Removed LoadGPXFileIntoGoogleMap and made it the callers
//                 responsibility.  Added more options (colour, width, delta).
//    revision 3 - Waypoint parsing now compatible with Firefox.
//    revision 4 - Upgraded to Google Maps API version 2.  Tried changing the way
//               that the map calculated the way the center and zoom level, but
//               GMAP API 2 requires that you center and zoom the map first.
//               I have left the bounding box calculations commented out in case
//               they might come in handy in the future.
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
		for (i=0; i<point.getElementsByTagName("html").item(0).childNodes.length; i++)
		{
			html += point.getElementsByTagName("html").item(0).childNodes[i].nodeValue;
		}
	}
	else
	{
		// Create the html if it does not exist in the point.
		html = "<b>" + this.TranslateName(point.nodeName) + "</b><br>";
		var attributes = point.attributes;
		var attrlen = attributes.length;
		for (i=0; i<attrlen; i++)
		{
			html += attributes.item(i).name + " = " + attributes.item(i).nodeValue + "<br>";
		}

		if (point.hasChildNodes)
		{
			var children = point.childNodes;
			var childrenlen = children.length;
			for (i=0; i<childrenlen; i++)
			{
				// Ignore empty nodes
				if (children[i].nodeType != 1) continue;
				if (children[i].firstChild == null) continue;
				html += children[i].nodeName + " = " + children[i].firstChild.nodeValue + "<br>";
			}
		}
	}

	var marker = new google.maps.Marker({
        position: new google.maps.LatLng(lat,lon),
        map: this.map
    });
	google.maps.Event.addListener(marker, "click",
		function()
		{
			marker.openInfoWindowHtml(html);
		}
	);

	// All methods that add items to the map return the bounding box of what they added.
	//var latlng = new google.maps.LatLng(lat,lon);
	//return new google.maps.LatLngBounds(latlng,latlng);
}


GPXParser.prototype.AddTrackSegmentToMap = function(trackSegment, colour, width)
{
	//var latlngbounds = new google.maps.LatLngBounds();

	var trackpoints = trackSegment.getElementsByTagName("trkpt");
	if (trackpoints.length == 0)
	{
		return; //latlngbounds;
	}

	var pointarray = [];

	// process first point
	var lastlon = parseFloat(trackpoints[0].getAttribute("lon"));
	var lastlat = parseFloat(trackpoints[0].getAttribute("lat"));
	var latlng = new google.maps.LatLng(lastlat,lastlon);
	pointarray.push(latlng);
	//latlngbounds.extend(latlng);

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
			latlng = new google.maps.LatLng(lat,lon);
			pointarray.push(latlng);
			//latlngbounds.extend(latlng);
		}

	}

	var polyline = new google.maps.Polyline({
        path: pointarray,
        strokeColor: colour,
        strokeWidth: width,
        map: this.map
    });

	// All methods that add items to the map return the bounding box of what they added.
	//return latlngbounds;
}

GPXParser.prototype.AddTrackToMap = function(track, colour, width)
{
	var segments = track.getElementsByTagName("trkseg");
	//var latlngbounds = new google.maps.LatLngBounds();
	for (var i=0; i < segments.length; i++)
	{
		var segmentlatlngbounds = this.AddTrackSegmentToMap(segments[i], colour, width);
		//this.AddTrackSegmentToMap(segments[i], colour, width);
		//latlngbounds.extend(segmentlatlngbounds.getSouthWest());
		//latlngbounds.extend(segmentlatlngbounds.getNorthEast());
	}

	// All methods that add items to the map return the bounding box of what they added.
	//return latlngbounds;
}

GPXParser.prototype.CenterAndZoom = function (trackSegment)
{

	var pointlist = new Array("trkpt", "wpt");
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

	if ( (minlat == maxlat) && (minlat == 0) )
	{
		this.map.setCenter(new google.maps.LatLng(49.327667, -122.942333), 14);
		return;
	}

	// Center around the middle of the points
	var centerlon = (maxlon + minlon) / 2;
	var centerlat = (maxlat + minlat) / 2;

	var bounds = new google.maps.LatLngBounds(
            new google.maps.LatLng(minlat, minlon),
            new google.maps.LatLng(maxlat, maxlon));
	this.map.setCenter(new google.maps.LatLng(centerlat, centerlon));
    this.map.fitBounds(bounds);
}

GPXParser.prototype.CenterAndZoomToLatLngBounds = function (latlngboundsarray)
{
	var boundingbox = new google.maps.LatLngBounds();
	for (var i=0; i<latlngboundsarray.length; i++)
	{
		if (!latlngboundsarray[i].isEmpty())
		{
			boundingbox.extend(latlngboundsarray[i].getSouthWest());
			boundingbox.extend(latlngboundsarray[i].getNorthEast());
		}
	}

	var centerlat = (boundingbox.getNorthEast().lat() + boundingbox.getSouthWest().lat()) / 2;
	var centerlng = (boundingbox.getNorthEast().lng() + boundingbox.getSouthWest().lng()) / 2;
	this.map.setCenter(new google.maps.LatLng(centerlat, centerlng), this.map.getBoundsZoomLevel(boundingbox));
}


GPXParser.prototype.AddTrackpointsToMap = function ()
{
	var tracks = this.xmlDoc.documentElement.getElementsByTagName("trk");
	//var latlngbounds = new google.maps.LatLngBounds();

	for (var i=0; i < tracks.length; i++)
	{
		this.AddTrackToMap(tracks[i], this.trackcolour, this.trackwidth);
		//var tracklatlngbounds = this.AddTrackToMap(tracks[i], this.trackcolour, this.trackwidth);
		//latlngbounds.extend(tracklatlngbounds.getSouthWest());
		//latlngbounds.extend(tracklatlngbounds.getNorthEast());
	}

	// All methods that add items to the map return the bounding box of what they added.
	//return latlngbounds;
}

GPXParser.prototype.AddWaypointsToMap = function ()
{
	var waypoints = this.xmlDoc.documentElement.getElementsByTagName("wpt");
	//var latlngbounds = new google.maps.LatLngBounds();

	for (var i=0; i < waypoints.length; i++)
	{
		this.CreateMarker(waypoints[i]);
		//var waypointlatlngbounds = this.CreateMarker(waypoints[i]);
		//latlngbounds.extend(waypointlatlngbounds.getSouthWest());
		//latlngbounds.extend(waypointlatlngbounds.getNorthEast());
	}

	// All methods that add items to the map return the bounding box of what they added.
	//return latlngbounds;
}


