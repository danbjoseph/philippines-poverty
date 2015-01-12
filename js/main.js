var windowH = $(window).height();
$("#map").height(windowH);
$("#infoWrapper").height(windowH);

var map = new L.Map("map", {
	center: [12.351, 122.893],
	zoom: 7,
  	minZoom: 5,
  // maxZoom: 12,
  	attributionControl: false,
  // maxBounds: [[3.98,114.96],[21.70,139.23]]
});

var attributionControl = L.control.attribution({
    position: 'bottomleft'
});
map.addControl(attributionControl);


function projectPoint(x, y) {
  var point = map.latLngToLayerPoint(new L.LatLng(y, x));
  this.stream.point(point.x, point.y);
}
var transform = d3.geo.transform({point: projectPoint}),
    path = d3.geo.path().projection(transform);

// initialize the SVG layer for D3 drawn survey points
map._initPathRoot()

// pick up the SVG from the map object
var svg = d3.select("#map").select("svg");
var worldGroup = svg.append('g').attr("id", "worldclip");
var municipalityGroup = svg.append('g').attr("id", "municipalities");
var changeGroup = svg.append('g').attr("id", "changeBubbles");


function getWorld(){
  d3.json("data/ne_110m.json", function(data){
    var worldData = topojson.feature(data, data.objects.ne_110m).features;
    var mappedWorld = worldGroup.selectAll("path")
      .data(worldData)
      .enter().append("path")
      .attr("class", "otherCountry")
      .attr("d",path)
      .on("mouseover", function(d){
        var tooltipText = "<strong>" + d.properties.name + "</strong>";
        $('#tooltip').append(tooltipText);             
      })
      .on("mouseout", function(d){ 
        $('#tooltip').empty();
      })
    function updateWorldPaths(){
      mappedWorld.attr("d", path);
    }
    map.on("viewreset", updateWorldPaths);
    getPhlData();
  });
}

var povertyData = [];

var currentYear = "2012";
d3.selectAll(".year-mapped").html(currentYear);


function getPhlData(){
	d3.csv("data/PHL_PovertyEstimates.csv", function(data1) {
		povertyData = data1;
		d3.json("data/municipalities.json", function(data2) {
			municipalitiesData = topojson.feature(data2, data2.objects.municipalities).features;
			
			// join poverty data to geo data
			$.each(municipalitiesData, function(indexGeo, municip){
				$.each(povertyData, function(indexPov, povData){
					if(municip.properties.ph == povData.ph){
						municip.properties["r"] = povData["r"];
						municip.properties["p"] = povData["p"];
						municip.properties["m"] = povData["m"];
						municip.properties["Pov_2012"] = povData["Pov_2012"];
						municip.properties["Pov_2009"] = povData["Pov_2009"];
						municip.properties["Pov_2006"] = povData["Pov_2006"];
						municip.properties["SE_2012"] = povData["SE_2012"];
						municip.properties["SE_2009"] = povData["SE_2009"];
						municip.properties["SE_2006"] = povData["SE_2006"];
					}
				});
			});

			// map muncipality polygons
			var mappedMunicipalities = municipalityGroup.selectAll("path")
				.data(municipalitiesData)
				.enter().append("path")
				.attr("class", "municipality")
				.attr("d",path)
				.on("mouseover", function(d){ 
					// var tooltipText = "<strong>" + d.properties.m + ", " + d.properties.p + "</strong>";
					// $('#tooltip').append(tooltipText);
					$("#infoAdmin-name").html(d.properties.m + ", " + d.properties.p);
					if(d.properties["Pov_" + currentYear] == undefined){
						$("#infoAdmin-statsUndefined").show();
					} else {
						$("#infoAdmin-pov").html(d.properties["Pov_" + currentYear]);      
						$("#infoAdmin-se").html(d.properties["SE_" + currentYear]); 
						$("#infoAdmin-stats").show();
					}
					

				})
				.on("mouseout", function(){ 
					// $('#tooltip').empty();
					$("#infoAdmin-name").html("<i>Hover over a municipality</i>");  
					$("#infoAdmin-stats").hide();
					$("#infoAdmin-statsUndefined").hide();      
				});
				function updateMunicipalitiesPaths(){
					mappedMunicipalities.attr("d", path);
				}
				map.on("viewreset", updateMunicipalitiesPaths);
			
			// add points to vizualize % change
			var changeMarkers = changeGroup.selectAll("circle").data(municipalitiesData).enter()
		      .append("circle").attr("r", 0);
		      // .on("mouseover", function(d){ 
		      //   $("#infoAdmin-name").html(d.properties.m + ", " + d.properties.p);
		      //   $("#infoAdmin-pop").html($(this).attr("data-pov2009") + "% poverty incidence");
		      //   $("#infoAdmin-pov").html(formatCommas($(this).attr("data-pop2010")) + " people");           
		      // })
		      // .on("mouseout", function(){ 
		      //   $("#infoAdmin-name").html("<i>Hover over a municipality</i>");
		      //   $("#infoAdmin-pop").empty();
		      //   $("#infoAdmin-pov").empty();
		      // });
		    function updatemarker(){
		      changeMarkers.attr("cx",function(d) { var thisLatLng = [d3.geo.centroid(d)[1], d3.geo.centroid(d)[0]]; return map.latLngToLayerPoint(thisLatLng).x;});
		      changeMarkers.attr("cy",function(d) { var thisLatLng = [d3.geo.centroid(d)[1], d3.geo.centroid(d)[0]]; return map.latLngToLayerPoint(thisLatLng).y;});
		    }
		    map.on("viewreset", updatemarker);
		    updatemarker();
			colorMap();
		}); 
	});

}

function dataYearSelect(selectedYear){
	currentYear = selectedYear;
	d3.selectAll(".year-mapped").html(currentYear);
	$("#year-compared").html(currentYear);
	colorMap();
}

function showChangeSelect(comparedYear){
	$("#year-compared").html(comparedYear);
	colorMap();
}

function colorMap(){
	var povColorScale = d3.scale.threshold()
    	.domain([20, 30, 40, 50, 100])
     	.range(["group0", "group1", "group2", "group3", "group4"]);

    var changeArray = [];
    municipalityGroup.selectAll("path").each(function(d){
    	var colorGroup = povColorScale(d.properties["Pov_" + currentYear]);
      	// clear previous group class assignment
      	d3.select(this).classed('group0 group1 group2 group3 group4', false);
      	// add new group class assignment
      	if(colorGroup !== undefined){
      		d3.select(this).classed(colorGroup, true);	
      	}

      	
    }); 

    var comparedYear = $("#year-compared").html();

    if(currentYear == comparedYear){
    	changeGroup.selectAll("circle").attr("r",0);
    } else {
		changeGroup.selectAll("circle").each(function(d){
	    	var currentPov = parseFloat(d.properties["Pov_" + currentYear]);
	      	var comparedPov = parseFloat(d.properties["Pov_" + comparedYear]);
	      	var percentChange = ( (comparedPov - currentPov) / currentPov ) * 100;
	   		if(isFinite(percentChange) == true && isNaN(percentChange) == false && percentChange !== 0){
	   			changeArray.push(Math.abs(percentChange));
	   		}
	      	d3.select(this).attr("data-displayedChange", percentChange);
	    })

	    // console.log(d3.extent(changeArray));
	    var minMarkerR = 1;
	    var maxMarkerR = 10;
	    var changeScale = d3.scale.log()
	    	// d3.extent returns [min, max] the Array
	    	.domain(d3.extent(changeArray))
	    	.range([minMarkerR,maxMarkerR]);

	    changeGroup.selectAll("circle")
	    	.attr("r", function(d){
	    		var changeValue = d3.select(this).attr("data-displayedChange");
	    		// console.log(changeScale(Math.abs(parseFloat(changeValue))));
	    		return changeScale(Math.abs(parseFloat(changeValue)));
	    	})
	    	.style("fill", function(d){
	    		var thisChange = d3.select(this).attr("data-displayedChange");
	    		if(thisChange > 0){
	    			return "#006837";
	    			//green
	    		} else if (thisChange < 0){
	    			return "#a50026";
	    			//red
	    		} else {
	    			return "#f5f5f5";
	    		}
	    	})

    }
    // end else block
    	
}


// on window resize
$(window).resize(function(){
    windowH = $(window).height();
    $("#map").height(windowH);
    $("#infoWrapper").height(windowH); 
})
getWorld();