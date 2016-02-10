viz.mapDraw = function(vars) {

  var hiddenTopo = ["04000US69", "04000US66", "04000US60", "04000US78", "05000US60050", "05000US60010", "05000US60020", "05000US66010", "05000US69100", "05000US69110", "05000US69120", "05000US69085", "79500US6600100"];
  var us_bounds = [[-0.6061309513487787,-0.9938707206384574],[0.40254429811306913,-0.44220355964829655]];

  var cartodb = vizStyles.tiles,
      defaultRotate = vars.id && vars.id.value === "birthplace" ? [0, 0] : [90, 0],
      defaultZoom = vars.id && vars.id.value === "birthplace" ? 1 : 0.95,
      pathOpacity = 0.25,
      pathStroke = 1,
      polyZoom = 1000,
      scaleAlign = "middle",
      scaleHeight = 10,
      scalePadding = 5,
      timing = 600,
      zoomFactor = 2;

  var scaleText = {
    "fill": vizStyles.legend.font.color,
    "font-family": vizStyles.legend.font.family,
    "font-size": vizStyles.legend.font.size,
    "font-weight": vizStyles.legend.font.weight
  }

  var borderColor = function(c) {
    return d3plus.color.legible(c);
  }

  var elementSize = function(element, s) {

    if (element.tagName === undefined || ["BODY","HTML"].indexOf(element.tagName) >= 0) {

      var val  = window["inner"+s.charAt(0).toUpperCase()+s.slice(1)];
      var elem = document !== element ? d3.select(element) : false;

      if (elem) {
        if (s === "width") {
          val -= parseFloat(elem.style("margin-left"), 10);
          val -= parseFloat(elem.style("margin-right"), 10);
          val -= parseFloat(elem.style("padding-left"), 10);
          val -= parseFloat(elem.style("padding-right"), 10);
        }
        else {
          val -= parseFloat(elem.style("margin-top"), 10);
          val -= parseFloat(elem.style("margin-bottom"), 10);
          val -= parseFloat(elem.style("padding-top"), 10);
          val -= parseFloat(elem.style("padding-bottom"), 10);
        }
      }
      vars[s].value = val;
    }
    else {
      val = parseFloat(d3.select(element).style(s), 10);
      if (typeof val === "number" && val > 0) {
        vars[s].value = val;
      }
      else if (element.tagName !== "BODY") {
        elementSize(element.parentNode, s);
      }
    }
  }

  vars.container.value
    .style("position", function() {
      var current = d3.select(this).style("position");
      var remain  = ["absolute","fixed"].indexOf(current) >= 0;
      return remain ? current : "relative"
    });

  // detect size on first draw
  if (!vars.width.value) elementSize(vars.container.value.node(), "width");
  if (!vars.height.value) elementSize(vars.container.value.node(), "height");

  var width = vars.width.value,
      height = vars.height.value,
      center = [width/2, height/2];

  var svg = vars.container.value.selectAll("svg").data([0]);
  svg.enter().append("svg")
    .attr("width", width)
    .attr("height", height);

  var coords = vars.coords.value;
  if (coords && vars.coords.key) {

    var projection = "mercator";
    if (vars.coords.key === "states" && location.href.indexOf("/map/") < 0) {
      projection = "albersUsaPr";
      vars.tiles.value = false;
    }

    if (vars.tiles.value) {

      svg.style("background-color", vars.messages.background)
        .transition().duration(timing)
        .style("background-color", "#cdd1d3");

      var attribution = vars.container.value.selectAll(".attribution").data([0]);

      attribution.enter().append("div")
        .attr("class", "attribution")
        .html('Map tiles by <a target="_blank" href="http://cartodb.com/attributions">CartoDB</a>')
        // .html('&copy; <a target="_blank" href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a target="_blank" href="http://cartodb.com/attributions">CartoDB</a>')

    }

    var tileGroup = svg.selectAll("g.tiles").data([0]);
    tileGroup.enter().append("g").attr("class", "tiles")
      .attr("opacity", 0).transition().duration(timing).attr("opacity", 1);

    var polyGroup = svg.selectAll("g.paths").data([0]);
    polyGroup.enter().append("g").attr("class", "paths")
      .attr("opacity", 0).transition().duration(timing).attr("opacity", 1);

    var pinGroup = svg.selectAll("g.pins").data([0]);
    pinGroup.enter().append("g").attr("class", "pins")
      .attr("opacity", 0).transition().duration(timing).attr("opacity", 1);

    var data_range = d3plus.util.uniques(vars.data.value, vars.color.value).filter(function(d){
      return d !== null && typeof d === "number";
    });

    if (data_range.length > 1) {

      var color_range = vizStyles.color.heatmap;
      data_range = d3plus.util.buckets(d3.extent(data_range), color_range.length);

      if (data_range.length > color_range.length) {
        data_range.pop();
      }

      var colorScale = d3.scale.sqrt()
        .domain(data_range)
        .range(color_range)
        .interpolate(d3.interpolateRgb)

    }
    else if (data_range.length) {
      var colorScale = function(d){ return vizStyles.color.heatmap[vizStyles.color.heatmap.length - 1]; }
    }
    else {
      var colorScale = false;
    }

    var dataMap = vars.data.value.reduce(function(obj, d){
      obj[d[vars.id.value]] = d;
      return obj;
    }, {});

    if (colorScale && colorScale.domain) {

      var scale = svg.selectAll("g.scale").data([0]);
      scale.enter().append("g")
        .attr("class", "scale")
        .attr("opacity", 0);

      var values = colorScale.domain(),
          colors = colorScale.range();

      var heatmap = scale.selectAll("#d3plus_legend_heatmap")
        .data(["heatmap"]);

      heatmap.enter().append("linearGradient")
        .attr("id", "d3plus_legend_heatmap")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%")
        .attr("spreadMethod", "pad");

      var stops = heatmap.selectAll("stop")
        .data(d3.range(0, colors.length));

      stops.enter().append("stop")
        .attr("stop-opacity",1);

      stops
        .attr("offset",function(i){
          return Math.round((i/(colors.length-1))*100)+"%";
        })
        .attr("stop-color",function(i){
          return colors[i];
        });

      stops.exit().remove();

      var heatmap2 = scale.selectAll("#d3plus_legend_heatmap_legible")
        .data(["heatmap"]);

      heatmap2.enter().append("linearGradient")
        .attr("id", "d3plus_legend_heatmap_legible")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%")
        .attr("spreadMethod", "pad");

      var stops = heatmap2.selectAll("stop")
        .data(d3.range(0, colors.length));

      stops.enter().append("stop")
        .attr("stop-opacity",1);

      stops
        .attr("offset",function(i){
          return Math.round((i/(colors.length-1))*100)+"%";
        })
        .attr("stop-color",function(i){
          return borderColor(colors[i]);
        });

      stops.exit().remove();

      var gradient = scale.selectAll("rect#gradient")
        .data(["gradient"]);

      gradient.enter().append("rect")
        .attr("id","gradient")
        .attr("x",function(d){
          if (scaleAlign == "middle") {
            return Math.floor(width/2);
          }
          else if (scaleAlign == "end") {
            return width;
          }
          else {
            return 0;
          }
        })
        .attr("y", scalePadding)
        .attr("width", 0)
        .attr("height", scaleHeight)
        // .attr("stroke", scaleText.fill)
        .style("stroke", "url(#d3plus_legend_heatmap_legible)")
        .attr("stroke-width",1)
        .attr("fill-opacity", pathOpacity)
        .style("fill", "url(#d3plus_legend_heatmap)");

      var text = scale.selectAll("text.d3plus_tick")
        .data(d3.range(0, values.length));

      text.enter().append("text")
        .attr("class","d3plus_tick")
        .attr("x",function(d){
          if (scaleAlign === "middle") {
            return Math.floor(width/2);
          }
          else if (scaleAlign === "end") {
            return width;
          }
          else {
            return 0;
          }
        })
        .attr("y",function(d){
          return this.getBBox().height + scaleHeight + scalePadding * 2;
        });

      var label_width = 0;

      text
        .order()
        .style("text-anchor", "middle")
        .attr(scaleText)
        .text(function(d){
          return vars.format.number(values[d], {"key": vars.color.value, "vars": vars});
        })
        .attr("y",function(d){
          return this.getBBox().height+scaleHeight+scalePadding*2;
        })
        .each(function(d){
          var w = this.offsetWidth;
          if (w > label_width) label_width = w;
        });

      label_width += scalePadding*2;

      var key_width = label_width * (values.length-1);

      if (key_width+label_width < width/2) {
        key_width = width/2;
        label_width = key_width/values.length;
        key_width -= label_width;
      }

      var start_x;
      if (scaleAlign == "start") {
        start_x = scalePadding;
      }
      else if (scaleAlign == "end") {
        start_x = width - scalePadding - key_width;
      }
      else {
        start_x = width/2 - key_width/2;
      }

      text.transition().duration(timing)
        .attr("x",function(d){
          return Math.floor(start_x + (label_width * d));
        });

      text.exit().transition().duration(timing)
        .attr("opacity", 0)
        .remove();

      var ticks = scale.selectAll("rect.d3plus_tick")
        .data(values, function(d, i){ return i; });

      function tickStyle(tick) {
        tick
          .attr("y", function(d, i){
            if (i === 0 || i === values.length - 1) {
              return scalePadding;
            }
            return scalePadding + scaleHeight;
          })
          .attr("height", function(d, i){
            if (i !== 0 && i !== values.length - 1) {
              return scalePadding;
            }
            return scalePadding + scaleHeight;
          })
          // .attr("fill", scaleText.fill)
          .attr("fill", function(d){
            return borderColor(colorScale(d));
          });
      }

      ticks.enter().append("rect")
        .attr("class", "d3plus_tick")
        .attr("x", function(d){
          if (scaleAlign == "middle") {
            return Math.floor(width/2);
          }
          else if (scaleAlign == "end") {
            return width;
          }
          else {
            return 0;
          }
        })
        .attr("width", 0)
        .call(tickStyle);

      ticks.transition().duration(timing)
        .attr("x",function(d, i){
          var mod = i === 0 ? 1 : 0;
          return Math.floor(start_x + (label_width * i) - mod);
        })
        .attr("width", 1)
        .call(tickStyle);

      ticks.exit().transition().duration(timing)
        .attr("width",0)
        .remove();

      gradient.transition().duration(timing)
        .attr("x",function(d){
          if (scaleAlign === "middle") {
            return Math.floor(width/2 - key_width/2);
          }
          else if (scaleAlign === "end") {
            return Math.floor(width - key_width - scalePadding);
          }
          else {
            return Math.floor(scalePadding);
          }
        })
        .attr("y", scalePadding)
        .attr("width", key_width)
        .attr("height", scaleHeight);

      var label = scale.selectAll("text.scale_label").data([0]);
      label.enter().append("text").attr("class", "scale_label")

      label
        .attr("text-anchor", scaleAlign)
        .attr("x",function(d){
          if (scaleAlign === "middle") {
            return Math.floor(width/2);
          }
          else if (scaleAlign === "end") {
            return width;
          }
          else {
            return 0;
          }
        })
        .attr("y", -scalePadding)
        .text(vars.format.text(vars.color.value))
        .attr(scaleText);

      var key_box = scale.node().getBBox(),
          key_height = key_box.height + key_box.y;

      // key_height += attribution.node().offsetHeight;
      key_height += scalePadding;

      scale.attr("transform" , "translate(0, " + (height - key_height) + ")")
        .transition().duration(timing).attr("opacity", 1);

      key_height += scalePadding;

    }
    else {
      key_height = 0;
    }

    var pinData = [];
    coords.objects[vars.coords.key].geometries = coords.objects[vars.coords.key].geometries.filter(function(c){
      if (vars.pins.value.indexOf(c.id) >= 0) pinData.push(c);
      if (hiddenTopo.indexOf(c.id) >= 0) return false;
      return vars.coords.solo.length ? vars.coords.solo.indexOf(c.id) >= 0 :
             vars.coords.mute.length ? vars.coords.mute.indexOf(c.id) < 0 : true;
    })
    var coordData = topojson.feature(coords, coords.objects[vars.coords.key]);

    if (!vars.zoom.set) {

      vars.zoom.projection = d3.geo[projection]()
        .scale(1)
        .translate([0, 0]);

      if (projection === "mercator") vars.zoom.projection.rotate(defaultRotate);

    }

    var b = projection === "mercator" && vars.id.value === "geo" && !vars.coords.solo.length ? us_bounds : false;

    projection = vars.zoom.projection;

    var path = d3.geo.path()
      .projection(projection);

    b = b || path.bounds(coordData);
    var s = defaultZoom / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / (height - key_height)),
        t = [(width - s * (b[1][0] + b[0][0])) / 2, (height - s * (b[1][1] + b[0][1])) / 2 - key_height/2];

    // Update the projection to use computed scale & translate.
    if (!vars.zoom.set) {

      // projection.scale(s).translate(t);

      vars.zoom.behavior = d3.behavior.zoom()
        .scale(s * 2 * Math.PI)
        .scaleExtent([1 << 9, 1 << 22])
        .translate(t)
        .on("zoom", zoomed);

      // With the center computed, now adjust the projection such that
      // it uses the zoom behavior’s translate and scale.
      projection
        .scale((1 * polyZoom) / 2 / Math.PI)
        .translate([0, 0]);

    }

    var zoom = vars.zoom.behavior;

    pinData = pinData.map(function(d){ return path.centroid(topojson.feature(coords, d)); });

    if (vars.zoom.value) {

      var controls = vars.container.value.selectAll(".map-controls").data([0]);
      var controls_enter = controls.enter().append("div")
        .attr("class", "map-controls");

      function zoomMath(factor) {

        var scale = zoom.scale(),
            extent = zoom.scaleExtent(),
            translate = zoom.translate(),
            x = translate[0], y = translate[1],
            target_scale = scale * factor;

        // If we're already at an extent, done
        if (target_scale === extent[0] || target_scale === extent[1]) { return false; }

        // If the factor is too much, scale it down to reach the extent exactly
        var clamped_target_scale = Math.max(extent[0], Math.min(extent[1], target_scale));
        if (clamped_target_scale != target_scale){
            target_scale = clamped_target_scale;
            factor = target_scale / scale;
        }

        // Center each vector, stretch, then put back
        x = (x - center[0]) * factor + center[0];
        y = (y - center[1]) * factor + center[1];

        zoom.scale(target_scale).translate([x, y]);
        zoomed(timing);
      }

      controls_enter.append("div").attr("class", "zoom-in").on(d3plus.client.pointer.click, function(){
        zoomMath(zoomFactor);
      });

      controls_enter.append("div").attr("class", "zoom-out").on(d3plus.client.pointer.click, function(){
        zoomMath(1/zoomFactor);
      });

      controls_enter.append("div").attr("class", "zoom-reset").on(d3plus.client.pointer.click, function(){
        d3plus.tooltip.remove("geo_map_sidebar");
        zoom.scale(s * 2 * Math.PI).translate(t);
        zoomed(timing);
      });

    }

    var polyStyle = function(p) {
      p
        .attr("fill", function(d) {
          var dat = dataMap[d.id];
          var val = dat && vars.color.value in dat ? dat[vars.color.value] : null;
          d.color = colorScale && val !== null && typeof val === "number" ? colorScale(val) : vizStyles.color.missing;
          return d.color;
        })
        .attr("fill-opacity", pathOpacity)
        .attr("stroke-width", pathStroke/(zoom.scale()/polyZoom))
        .attr("stroke", function(d){
          return borderColor(d.color);
        });
    }

    var polys = polyGroup.selectAll("path")
      .data(coordData.features, function(d){
        if (vars.mouse.value && vars.highlight.value === d.id) createTooltip(d, true);
        return d.id;
      });

    polys.exit().remove();

    polys.enter().append("path")
      .attr("d", path)
      // .attr("vector-effect", "non-scaling-stroke")
      .attr("class", function(d){
        var o = {};
        o[vars.id.value] = d.id;
        var c = vars.class.value ? vars.class.value(o, vars) : "";
        return "d3plus_coordinates " + c;
      })
      .attr("id", function(d){
        return d.id;
      })
      .call(polyStyle);

    function createTooltip(d, big) {
      var dat = dataMap[d.id];

      var id = big ? "geo_map_sidebar" : "geo_map";

      if (big) {
        var margin = 0, x = window.innerWidth - margin - vizStyles.tooltip.small/2, y = margin;
      }
      else {
        var mouse = d3.mouse(d3.select("html").node()),
            x = mouse[0], y = mouse[1];
      }
      var tooltip_data = [];

      var tooltip_data = vars.tooltip.value.reduce(function(arr, t){
        if (dat && t in dat && dat[t] !== null && dat[t] !== undefined) {
          arr.push({
            "group": "",
            "name": vars.format.text(t, {}),
            "value": vars.format.value(dat[t], {"key": t}),
            "highlight": t === vars.color.value
          });
        }
        return arr;
      }, []);

      var html = false, link = "/profile/geo/" + d.id + "/";
      if (big && vars.tooltip.url) {
        html = "<div class='d3plus_tooltip_html_seperator'></div>";
        // html = "<a class='btn pri-btn' href='" + link + "'>View Profile</a>";
        if (big.constructor === String) {
          html += big;
        }
        else {
          html += "<div class='loader'><i class='fa fa-circle-o-notch fa-spin'></i>Loading Data</div>";
        }
      }

      var tooltip_obj = {
        "arrow": big ? false : true,
        "background": vizStyles.tooltip.background,
        "color": big ? false : d.color,
        "data": tooltip_data,
        "description": big ? "Last selected geography" : false,
        "fontcolor": vizStyles.tooltip.font.color,
        "fontfamily": vizStyles.tooltip.font.family,
        "fontsize": vizStyles.tooltip.font.size,
        "fontweight": vizStyles.tooltip.font.weight,
        "footer": big ? false : !vars.zoom.value ? "Click to View Profile" : "Click for More Info",
        "html": html,
        "id": id,
        "js": big ? function(elem) {
          elem.select(".d3plus_tooltip_title").on(d3plus.client.pointer.click, function(){
            window.location = link;
          });
        } : false,
        "max_width": vizStyles.tooltip.small,
        "mouseevents": big ? true : false,
        "offset": big ? 0 : 3,
        "parent": big ? vars.container.value : d3.select("body"),
        "title": vars.format.text(d.id, {"key": vars.id.value, "vars": vars}, {"viz": vars.self}),
        "width": vizStyles.tooltip.small,
        "x": x,
        "y": y
      };

      d3plus.tooltip.remove(id);
      d3plus.tooltip.create(tooltip_obj);

      if (big === true && vars.tooltip.url) {
        var url = vars.tooltip.url + "&limit=10";
        var prefix = d.id.slice(0, 3)
        if (prefix == "040") {
          url += "&where=geo:^" + d.id.replace("040", "050");
        }
        else {
          url += "&geo=" + d.id;
        }
        load(url, function(data) {
          var list = data.map(function(c){
            return "<li><a href='/profile/geo/" + c.geo + "/'>" + vars.attrs.value[c.geo].name + "</a></li>";
          }).join("");
          list = "<ol>Top 10 Counties" + list + "</ol>";
          createTooltip(d, list);
        });
      }

    }

    if (vars.mouse.value) {

      var drag = true;

      polys
        .on(d3plus.client.pointer.over, function(d){
          d3.select(this).attr("fill-opacity", pathOpacity * 2).style("cursor", "pointer");
          createTooltip(d);
        })
        .on(d3plus.client.pointer.move, function(d){
          drag = d3.event.buttons ? true : false;
          d3.select(this).attr("fill-opacity", pathOpacity * 2).style("cursor", "pointer");
          createTooltip(d);
        })
        .on(d3plus.client.pointer.out, function(d){
          d3.select(this).attr("fill-opacity", pathOpacity);
          d3plus.tooltip.remove("geo_map");
        })
        .on(d3plus.client.pointer.click, function(d){
          if (!vars.zoom.value) {
            window.location = "/profile/geo/" + d.id + "/";
          }
          else if (drag) {
            drag = false;
          }
          else {
            vars.highlight.value = d.id;
            d3.select(this).attr("fill-opacity", pathOpacity);
            d3plus.tooltip.remove("geo_map");
            zoomToBounds(path.bounds(d));
            createTooltip(d, true);
          }
        });

    }

    polys
      .transition().duration(timing)
      .call(polyStyle);

    var pins = pinGroup.selectAll(".pin").data(pinData);
    pins.enter().append("path")
      .attr("class", "pin")
      .attr("vector-effect", "non-scaling-stroke")
      .attr("stroke-width", 1)
      .attr("d", vizStyles.pin.path)
      .attr("fill", vizStyles.pin.color)
      .attr("stroke", vizStyles.pin.stroke);

    if (vars.tiles.value) {
      var tile = d3.geo.tile()
        .size([width, height])
        .overflow([true, false]);
    }

    if (vars.zoom.value) {
      svg.call(zoom)
      if (!vars.zoom.scroll) {
        svg
          .on("mousewheel.zoom",null)
          .on("MozMousePixelScroll.zoom",null)
          .on("wheel.zoom",null);
      }
    }

    if (!vars.zoom.set) {
      zoomed();
      vars.zoom.set = true;
    }

  }

  function zoomToBounds(b) {

    var w = width - 300;

    var s = defaultZoom / Math.max((b[1][0] - b[0][0]) / w, (b[1][1] - b[0][1]) / (height - key_height)),
        t = [(w - s * (b[1][0] + b[0][0])) / 2, (height - s * (b[1][1] + b[0][1])) / 2 - key_height/2];

    s = (s/Math.PI/2) * polyZoom;

    zoom.scale(s * 2 * Math.PI).translate(t);
    zoomed(timing);

  }

  function zoomed(zoomtiming) {

    if (vars.tiles.value) {
      var t = zoom.translate(),
          d = projection(defaultRotate)[0] - projection([0, 0])[0];
      t[0] += (d/polyZoom) * zoom.scale();
      var tileData = tile
        .scale(zoom.scale())
        .translate(t)
        ();
    }
    else {
      var tileData = [];
    }

    var pz = zoom.scale() / polyZoom;
    polyGroup.attr("transform", "translate(" + zoom.translate() + ")scale(" + pz + ")")
      .selectAll("path").attr("stroke-width", pathStroke/pz);
    pinGroup.attr("transform", "translate(" + zoom.translate() + ")scale(" + pz + ")")
      .selectAll(".pin")
      .attr("transform", function(d){
        return "translate(" + d + ")scale(" + (1/pz*vizStyles.pin.scale) + ")";
      });

    if (vars.tiles.value) {
      tileGroup.attr("transform", "scale(" + tileData.scale + ")translate(" + tileData.translate + ")");
    }

    var tilePaths = tileGroup.selectAll("image.tile")
        .data(tileData, function(d) { return d; });

    tilePaths.exit().remove();

    tilePaths.enter().append("image")
      .attr("xlink:href", function(d) {
        var x = d[0] % tileData.width;
        if (x < 0) x += tileData.width;
        return "http://" + ["a", "b", "c", "d"][Math.random() * 3 | 0] + ".basemaps.cartocdn.com/" + cartodb + "/" + d[2] + "/" + x + "/" + d[1] + ".png";
      })
      .attr("width", 1)
      .attr("height", 1)
      .attr("x", function(d) { return d[0]; })
      .attr("y", function(d) { return d[1]; });

  }

  return vars.self;

}
