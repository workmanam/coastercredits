
var map, featureList, parkSearch = [], coasterSearch = [];

$(window).resize(function() {
  sizeLayerControl();
});

$(document).on("click", ".feature-row", function(e) {
  $(document).off("mouseout", ".feature-row", clearHighlight);
  sidebarClick(parseInt($(this).attr("id"), 10));
});

if ( !("ontouchstart" in window) ) {
  $(document).on("mouseover", ".feature-row", function(e) {
    var layer = parks.getLayer(parseInt($(this).attr("id"), 10));
    if (layer) {
  // No feature highlighting
}
  });
}

$(document).on("mouseout", ".feature-row", clearHighlight);

$("#about-btn").click(function() {
  $("#aboutModal").modal("show");
  $(".navbar-collapse.in").collapse("hide");
  return false;
});

$("#full-extent-btn").click(function() {
  if (parks.getLayers().length > 0) {
    map.fitBounds(parks.getBounds());
  }
  $(".navbar-collapse.in").collapse("hide");
  return false;
});

$("#login-btn").click(function() {
  $("#loginModal").modal("show");
  $(".navbar-collapse.in").collapse("hide");
  return false;
});

$("#list-btn").click(function() {
  animateSidebar();
  return false;
});

$("#nav-btn").click(function() {
  $(".navbar-collapse").collapse("toggle");
  return false;
});

$("#sidebar-toggle-btn").click(function() {
  animateSidebar();
  return false;
});

$("#sidebar-hide-btn").click(function() {
  animateSidebar();
  return false;
});

function animateSidebar() {
  $("#sidebar").animate({
    width: "toggle"
  }, 350, function() {
    map.invalidateSize();
  });
}

function sizeLayerControl() {
  $(".leaflet-control-layers").css("max-height", $("#map").height() - 50);
}

function clearHighlight() {
  highlight.clearLayers();
}

function sidebarClick(id) {
  var layer = parks.getLayer(id);

  if (layer) {
    map.fitBounds(layer.getBounds());
    layer.fire("click");
  }

  /* Hide sidebar and go to the map on small screens */
  if (document.body.clientWidth <= 767) {
    $("#sidebar").hide();
    map.invalidateSize();
  }
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function displayValue(value) {
  return value === null || value === undefined || value === "" ? "N/A" : escapeHtml(value);
}

function syncSidebar() {
  /* Empty sidebar features */
  $("#feature-list tbody").empty();

  if (map.hasLayer(parks)) {
    var displayedParks = {};

    parks.eachLayer(function (layer) {
      var parkName = layer.feature.properties.park || "Unnamed Park";

      if (!displayedParks[parkName]) {
        displayedParks[parkName] = true;

        $("#feature-list tbody").append(
          '<tr class="feature-row" id="' + L.stamp(layer) +
          '" lat="' + layer.getBounds().getCenter().lat +
          '" lng="' + layer.getBounds().getCenter().lng +
          '"><td style="vertical-align: middle;"><i class="fa fa-circle-o"></i></td>' +
          '<td class="feature-name">' + escapeHtml(parkName) +
          '</td><td style="vertical-align: middle;"><i class="fa fa-chevron-right pull-right"></i></td></tr>'
        );
      }
    });
  }

  /* Update list.js featureList */
  featureList = new List("features", {
    valueNames: ["feature-name"]
  });
  featureList.sort("feature-name", {
    order: "asc"
  });
}

/* Basemap Layers */

var cartoLight = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png?key=cb1_2kni_1_6090a43235f237424ee349db', {
  attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
  maxZoom: 21
});

var baseLayers = {
  "Street Map": cartoLight
};

/* Overlay Layers */
var highlight = L.geoJson(null, {
  style: {
    opacity: 0,
    weight: 0,
    fillOpacity: 0
  }
});

var highlightStyle = {
  opacity: 0,
  weight: 0,
  fillOpacity: 0
};

/* Parks Layer */
var parks = L.geoJson(null, {
  style: function (feature) {
    return {
      stroke: false,
      fill: false
    };
  },
  onEachFeature: function (feature, layer) {
    if (feature.properties) {
      var parkName = feature.properties.park || "Unnamed Park";

      var content =
        "<table class='table table-striped table-bordered table-condensed'>" +
        "<tr><th>Park</th><td>" + displayValue(parkName) + "</td></tr>" +
        "</table>";

      /* Add each park to the park search list only once */
      if (!parkSearch.some(function (item) {
        return item.name === parkName;
      })) {
        parkSearch.push({
          name: parkName,
          source: "Parks",
          id: L.stamp(layer),
          bounds: layer.getBounds()
        });
      }
    }
  }
});

$.getJSON("data/parks.geojson", function (data) {
  parks.addData(data);
  syncSidebar();
}).fail(function (jqxhr, textStatus, error) {
  console.error("Parks GeoJSON failed to load:", textStatus, error);
});

/* Roller Coaster Track Layer */
function coasterColor(value) {
  if (value === null || value === undefined || value === "") {
    return "#3388ff";
  }

  var color = String(value).replace("#", "").trim();

  if (/^\d+$/.test(color) && color.length < 6) {
    color = color.padStart(6, "0");
  }

  if (/^[0-9a-fA-F]{1,6}$/.test(color)) {
    return "#" + color.padStart(6, "0");
  }

  return "#3388ff";
}

var coasters = L.geoJson(null, {
  style: function (feature) {
    return {
      color: coasterColor(feature.properties.color),
      weight: 4,
      opacity: 0.9
    };
  },
  onEachFeature: function (feature, layer) {
    if (feature.properties) {
      var properties = feature.properties;

            var statusColor = "black";

      if (properties.status === "OPERATING") {
        statusColor = "green";
      } else if (properties.status === "CLOSING") {
        statusColor = "orange";
      } else if (properties.status === "DEFUNCT") {
        statusColor = "red";
      }

      var coasterName = properties.rcdb
        ? "<a href='" + escapeHtml(properties.rcdb) + "' target='_blank' rel='noopener noreferrer' style='color: blue; text-decoration: none;'>" +
          displayValue(properties.coaster) + "</a>"
        : displayValue(properties.coaster);

      var content = `
        <div style="font-family: 'Lexend', sans-serif; line-height: 1.4em;">
          <strong>${coasterName}</strong><br>
          <strong>${displayValue(properties.park)}</strong><br>
          <span style="color: black;">${displayValue(properties.make)}</span><br>
          <span style="color: black;">${displayValue(properties.model)}</span><br>
          <span style="color: black;">Opened ${displayValue(properties.opened)}</span><br>
          <span style="color: black;">${displayValue(properties.height)} ft tall</span><br>
          <span style="color: black;">${displayValue(properties.speed)} mph</span><br>
          <span style="color: black;">${displayValue(properties.length)} ft long</span><br>
          <span style="color: black;">${displayValue(properties.inversions)} Inversions</span><br>
          <span style="color: ${statusColor}; font-weight: bold;">${displayValue(properties.status)}</span>
        </div>
      `;

      content += "</table>";

      /* Bind coaster information to a clickable tooltip */
            /* Bind coaster information to a clickable tooltip */
            /* Show coaster information only when clicked */
      var coasterTooltip = L.tooltip({
        direction: "top",
        opacity: 0.95,
        className: "coaster-tooltip",
        sticky: false,
        interactive: true
      });

      layer.on({
        click: function (e) {
          coasterTooltip
            .setLatLng(e.latlng)
            .setContent(content);

          map.openTooltip(coasterTooltip);
        },
        mouseover: function (e) {
          layer.setStyle({
            weight: 6,
            opacity: 1
          });

          if (!L.Browser.ie && !L.Browser.opera) {
            layer.bringToFront();
          }
        },
        mouseout: function (e) {
          coasters.resetStyle(e.target);
        }
      });

      coasterSearch.push({
        name: properties.coaster || "Unnamed Coaster",
        park: properties.park || "",
        source: "Roller Coasters",
        id: L.stamp(layer),
        bounds: layer.getBounds()
      });
    }
  }
});

$.getJSON("data/MyCoasterCreditsSmooth.geojson", function (data) {
  $.getJSON("data/MyCoasterCreditsSmooth.geojson", function (data) {
  coasters.addData(data);
  $("#credit-count").text(data.features.length);
}).fail(function (jqxhr, textStatus, error) {
  console.error("Coaster GeoJSON failed to load:", textStatus, error);
});
  console.log("Coaster GeoJSON loaded:", data.features.length, "features");
  coasters.addData(data);
}).fail(function (jqxhr, textStatus, error) {
  console.error("Coaster GeoJSON failed to load:", textStatus, error);
});

/* Initialize map */
map = L.map("map", {
  zoom: 16,
  center: [37.23276770191781, -76.64426855380704],
  layers: [cartoLight, parks, coasters, highlight],
  attributionControl: false
});

/* Layer control listeners */
map.on("overlayadd", function(e) {
  if (e.layer === parks) {
    syncSidebar();
  }

  if (e.layer === coasters) {
    syncSidebar();
  }
});

map.on("overlayremove", function(e) {
  if (e.layer === parks) {
    syncSidebar();
  }

  if (e.layer === coasters) {
    syncSidebar();
  }
});

/* Filter sidebar feature list to only show parks in current map bounds */
map.on("moveend", function (e) {
  syncSidebar();
});

/* Clear feature highlight when map is clicked */
map.on("click", function(e) {
  highlight.clearLayers();
});

/* Attribution control */
function updateAttribution(e) {
  $.each(map._layers, function(index, layer) {
    if (layer.getAttribution) {
      $("#attribution").html((layer.getAttribution()));
    }
  });
}

map.on("layeradd", updateAttribution);
map.on("layerremove", updateAttribution);

var attributionControl = L.control({
  position: "bottomright"
});

attributionControl.onAdd = function (map) {
  var div = L.DomUtil.create("div", "leaflet-control-attribution");
  div.innerHTML = "<span class='hidden-xs'>Developed by <a href='http://bryanmcbride.com'>bryanmcbride.com</a> | </span><a href='#' onclick='$(\"#attributionModal\").modal(\"show\"); return false;'>Attribution</a>";
  return div;
};

map.addControl(attributionControl);

/* Larger screens get expanded layer control and visible sidebar */
if (document.body.clientWidth <= 767) {
  var isCollapsed = true;
} else {
  var isCollapsed = false;
}



var layerControl = L.control.groupedLayers(baseLayers, groupedOverlays, {
  collapsed: isCollapsed
}).addTo(map);

/* Highlight search box text on click */
$("#searchbox").click(function () {
  $(this).select();
});

/* Prevent hitting enter from refreshing the page */
$("#searchbox").keypress(function (e) {
  if (e.which == 13) {
    e.preventDefault();
  }
});

$("#featureModal").on("hidden.bs.modal", function (e) {
  $(document).on("mouseout", ".feature-row", clearHighlight);
});

/* Typeahead search functionality */
$(document).ready(function () {
  $("#loading").hide();
  sizeLayerControl();

  /* Fit map to parks bounds */
  if (parks.getLayers().length > 0) {
    map.fitBounds(parks.getBounds());
  }

  featureList = new List("features", {
    valueNames: ["feature-name"]
  });

  featureList.sort("feature-name", {
    order: "asc"
  });

  var parksBH = new Bloodhound({
    name: "Parks",
    datumTokenizer: function (d) {
      return Bloodhound.tokenizers.whitespace(d.name);
    },
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    local: parkSearch,
    limit: 10
  });

  var coastersBH = new Bloodhound({
    name: "Roller Coasters",
    datumTokenizer: function (d) {
      return Bloodhound.tokenizers.whitespace(d.name + " " + d.park);
    },
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    local: coasterSearch,
    limit: 10
  });

  var geonamesBH = new Bloodhound({
    name: "GeoNames",
    datumTokenizer: function (d) {
      return Bloodhound.tokenizers.whitespace(d.name);
    },
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    remote: {
      url: "https://api.geonames.org/searchJSON?username=bootleaf&featureClass=P&maxRows=5&countryCode=US&name_startsWith=%QUERY",
      filter: function (data) {
        return $.map(data.geonames, function (result) {
          return {
            name: result.name + ", " + result.adminCode1,
            lat: result.lat,
            lng: result.lng,
            source: "GeoNames"
          };
        });
      },
      ajax: {
        beforeSend: function (jqXhr, settings) {
          settings.url += "&east=" + map.getBounds().getEast() + "&west=" + map.getBounds().getWest() + "&north=" + map.getBounds().getNorth() + "&south=" + map.getBounds().getSouth();
          $("#searchicon").removeClass("fa-search").addClass("fa-refresh fa-spin");
        },
        complete: function (jqXHR, status) {
          $('#searchicon').removeClass("fa-refresh fa-spin").addClass("fa-search");
        }
      }
    },
    limit: 10
  });

  parksBH.initialize();
  coastersBH.initialize();
  geonamesBH.initialize();

  /* instantiate the typeahead UI */
  $("#searchbox").typeahead({
    minLength: 3,
    highlight: true,
    hint: false
  }, {
    name: "Parks",
    displayKey: "name",
    source: parksBH.ttAdapter(),
    templates: {
      header: "<h4 class='typeahead-header'><i class='fa fa-tree'></i>&nbsp;Parks</h4>"
    }
  }, {
    name: "Roller Coasters",
    displayKey: "name",
    source: coastersBH.ttAdapter(),
    templates: {
      header: "<h4 class='typeahead-header'><i class='fa fa-train'></i>&nbsp;Roller Coasters</h4>",
      suggestion: Handlebars.compile(["{{name}}<br>&nbsp;<small>{{park}}</small>"].join(""))
    }
  }, {
    name: "GeoNames",
    displayKey: "name",
    source: geonamesBH.ttAdapter(),
    templates: {
      header: "<h4 class='typeahead-header'><img src='assets/img/globe.png' width='25' height='25'>&nbsp;GeoNames</h4>"
    }
  }).on("typeahead:selected", function (obj, datum) {
    if (datum.source === "Parks") {
      if (!map.hasLayer(parks)) {
        map.addLayer(parks);
      }

      map.fitBounds(datum.bounds);

      var park = parks.getLayer(datum.id);
      if (park) {
        park.fire("click");
      }
    }

    if (datum.source === "Roller Coasters") {
      if (!map.hasLayer(coasters)) {
        map.addLayer(coasters);
      }

      var coaster = coasters.getLayer(datum.id);
      if (coaster) {
        map.fitBounds(datum.bounds, {
          maxZoom: 17
        });
        coaster.fire("click", {
          latlng: coaster.getBounds().getCenter()
        });
      }
    }

    if (datum.source === "GeoNames") {
      map.setView([datum.lat, datum.lng], 14);
    }

    if ($(".navbar-collapse").height() > 50) {
      $(".navbar-collapse").collapse("hide");
    }
  }).on("typeahead:opened", function () {
    $(".navbar-collapse.in").css("max-height", $(document).height() - $(".navbar-header").height());
    $(".navbar-collapse.in").css("height", $(document).height() - $(".navbar-header").height());
  }).on("typeahead:closed", function () {
    $(".navbar-collapse.in").css("max-height", "");
    $(".navbar-collapse.in").css("height", "");
  });

  $(".twitter-typeahead").css("position", "static");
  $(".twitter-typeahead").css("display", "block");
});

// Leaflet patch to make layer control scrollable on touch browsers
var container = $(".leaflet-control-layers")[0];

if (!L.Browser.touch) {
  L.DomEvent
  .disableClickPropagation(container)
  .disableScrollPropagation(container);
} else {
  L.DomEvent.disableClickPropagation(container);
}
