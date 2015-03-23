/* Manuele Cavalli-Sforza
   2014-09-12
   https://github.com/ManniCS/civet */

/* Turn on tooltips for demo */	
$(document).ready(function() {
        $('.tooltip').tooltipster();
});

/** Setting up constants. **/
var w = self.window.innerWidth;
var h = self.window.innerHeight;
var colorscheme1 = true;
var colorscheme2 = colorscheme1 ? false : true;
var node_radius = 8; //colorscheme1 ? 15 : colorscheme2 ? 10 : 10,
var node_stroke_width = 3;
var refX = colorscheme1 ? 25 : colorscheme2 ? 23 : 23;
var refY = colorscheme1 ? 0 : colorscheme2 ? 0 : 0;
var markerHeight = colorscheme1 ? 11 : colorscheme2 ? 8 : 8;
var markerWidth = colorscheme1 ? 11 : colorscheme2 ? 8 : 8;
var path = colorscheme1 ? "M0,-3L10,0L0,3" : colorscheme2 ? "M0,-4L10,0L0,4" : "M0,-4L10,0L0,4"; //path for marker
var show_traversed_path_color = "#fd5f00";
var single_click_timeout = 500;
var layout_freeze_key_code = 91; //Keycode for the key to freeze the layout upon keydown (currently corresponds to the Cmd key on mac)
var show_traversed_path_key_code = 83; //Currently the s key//18; //Keycode for the key to show the path of traversed nodes (currently corresponds to the option key on mac)
var d_key_pressed_key_code = 68; //d key
var data_file = "example_data/graph"; //"test_1"; //graph_w_parents

/* Declare variables that will be used globally later in the script. */
var force, //variable for force layout
	drag, //the drag event handler to use on the force layout
    l, n, //Calculate the number of links and nodes on the string. 
    nodes2, links2, //Set of nodes and links in the original dataset
    restarted, //Variable to indicated whether the layout has been restarted yet
    last_click = (new Date).getTime(), //Variable to record the last_click on the dom
    last_clicked = "", //Name of the last node clicked 
    show_traversed_path = false, //Global toggle boolean for whether the traversed path should be shown
    layout_frozen = false, //Global togglable boolean for whether the layout is frozen
    d_key_pressed = false, //Global bool for d key press
    file_to_path_mapping = {"STGlobalSettingsCell": "SecureTextMessaging/SecureTextMessaging/Classes/STGlobalSettingsCell.h", "SDCAlertViewContentView": "SecureTextMessaging/SecureTextMessaging/Classes/SDCAlertView/SDCAlertViewContentView.h", "STViewController": "SecureTextMessaging/SecureTextMessaging/Classes/STViewController.h"};

/* Setup DOM for manipulation later by d3. */
var viz_window = d3.select("body").append("div")
								  .style("height", self.window.innerHeight + "px")
								  .style("width", self.window.innerWidth + "px")
								  .style("overflow-y", "scroll")
								  .style("overflow-x", "scroll");

var svg = viz_window.append("svg")
				    .attr("height", h)
				    .attr("width", w)
				    .attr("z-index", -1);

/* The set of all d3 elements on the screen 
   (and data bound to them.) */
var links = svg.selectAll("line"),
	nodes = svg.selectAll("circle"),
	text = svg.selectAll("text"); //labels

/* Define the datasets to be used globally later in the script */
var dataset = {}; //the dataset of reduced nodes
var dataset2 = {}; //the primary dataset
var traversed = []; //the names of all of the traversed nodes
var fixed = []; //the names of all fixed nodes
var temp_fixed = []; //names of all temporarily fixed nodes

/* Asynchronously load the data for the datasets into the corresponding variables
   from their corresponding json files */
d3.json(data_file + "._json", function(error, json) { 
	dataset = json;
}); 

/* Asynchronously load the data for the datasets into the corresponding variables
   from their corresponding json files */
d3.json(data_file + ".json", function(error, json) { 
	dataset2 = json;
});

/* Register the key listeners on the DOM .*/
window.onkeydown = function (e) { 
	var key = e.keyCode ? e.keyCode : e.which; //get keycode

	if (key == layout_freeze_key_code) { 
		if (layout_frozen ? layout_frozen = false : layout_frozen = true) { //toggle layout frozen boolean
			fixAllLayoutNodes(true);
			// force.stop(); //stop the force layout to freeze it as it is
		} else {
			temp_fixed = []; //remove all temp-fixed nodes
			unfixAllLayoutNodes(); 
			restart();
		}
			// force.start();
	} else if (key == show_traversed_path_key_code) { 
		show_traversed_path ? show_traversed_path = false : show_traversed_path = true; //toggle value of show_traversed_path

		svg.selectAll("circle") //recolor all circles
		   .style("fill", color)
		   .style("stroke", nodeStrokeColor); 
		svg.selectAll("line") //recolor all links
		   .style("stroke", linkColor);
	} else if (key == d_key_pressed_key_code)
		d_key_pressed = true;
}

window.onkeyup = function (e) { 
	var key = e.keyCode ? e.keyCode : e.which; //get keycode

	if (key == d_key_pressed_key_code) 
		d_key_pressed = false;
}

/* Return the coloring for a node. */
var color = function (d) { 
	if (show_traversed_path && (traversed.indexOf(d.name) != -1 || d._originalNode))
		return show_traversed_path_color;
	else if (d._originalNode) 
		return (d.children && d.children.length > 0) ? "db6058" : "#d62013";
	else if (d.children && d.children.length > 0) 
		return colorscheme1 ? "#c6dbef" : colorscheme2 ? "#fff" : "#000"; //children_expanded_color();
	else if (d._children && d._children.length > 0)
		return colorscheme1 ? "#3182bd" : colorscheme2 ? "lightsteelblue" : "#000"; //children_collapsed_color(); 
	else 
		return colorscheme1 ? "#fd8d3c" : colorscheme2 ? "#fff" : "#000"  //no_children_color();
}

/* Return the appropriate color of the link in question.*/
var linkColor = function (d) { 
	if (show_traversed_path && traversed.indexOf(d.target.name) != -1)
		return show_traversed_path_color;
	else
		return "#ccc";
}

/* Returns the stroke color for a node based 
   on the data bound to it. */
var nodeStrokeColor = function (d) { 
	if (show_traversed_path && traversed.indexOf(d.name) != -1) {
		console.log("Hey, I'm deciding " + d.name + "'s color! It's the special one!");
		return show_traversed_path_color;
	}
	else 
		return "#3182bd";
}

/* Declare what happens on the start of a drag. In this case, 
   modify the application-wide variable that tracks whether 
   the layout is frozen. */
var dragstart = function () { 
	layout_frozen = false; //let the layout know that it is not frozen
}

/* Initialize the contents of the instructions box */
var instructions = { "title_pre_tool_name" : "This is a demo of ", 
					 "tool_name" : "epocCivet",
					 "title_post_tool_name" : ". The red nodes represent the files from a  particular change list. " + 
					 "Parent nodes represent dependencies in this framework. A node that is colored dark blue will have children to expand; a node which is colored light blue has children that are already expanded, and a node which is colored orange has no children. Click on a node to explore what files are dependent on it. Try tapping the Cmd key on a Mac, Alt-clicking on nodes, toggling the S key, and scrolling down or right, for additional behavior. Please note that this is not a completed version of the application."};

/* Dynamically draw + populate the instructions box on the page with the content specified in the passed parameter */
var drawInstructions = function (instructions) { 
	/* Populate local variables based on the content of the instructions argument. */
	var title_pre_tool_name = instructions.title_pre_tool_name,
		tool_name = instructions.tool_name,
		title_post_tool_name = instructions.title_post_tool_name;

	//Add title to screen
	var title_div = d3.select("body").append("div")
					  .attr("class", "title tooltip")
					  .attr("title", "Click to dismiss me")
					  .on("click", function () { 
					  	this.remove();
					  });

	//Style margin property (center on the screen horizontally)
	title_div.style("margin-left", function () { 
				var div_width = Number(d3.select("div.title").style("width").slice(0, -2)); //trim off last two characters "px"
		  		return (self.window.innerWidth / 2.0 - div_width / 2.0).toString() + "px"; //convert back to string with "px"
		  	});

	//Insert tool icon
	var icon_location = "resources/civet.png"
	var icon = title_div.append("img")
			 .attr("src", icon_location)
			 .attr("class", "icon");

	//Insert text container, and insert and style text
	var text_span = title_div.append("span")
							.attr("class", "text_span");

	text_span.append("span") //Style text before tool name
			 .attr("class", "title")
			 .html(title_pre_tool_name);

	text_span.append("i").append("span") //Style tool name 
			 .attr("class", "emphasis")
			 .html(tool_name);

	text_span.append("span") //Style text after tool name
			 .attr("class", "title")
			 .html(title_post_tool_name);

    //Set the title div's height based on the span text and center the image
    title_div.style("height", "90px");

    icon.style("top", function() { 
    	var icon_height = Number(icon.style("height").slice(0, -2));
    	return (45 - icon_height / 2.0 - 0.5).toString() + "px";
    });
}

/* Draws the instruction box on the page.*/
drawInstructions(instructions);

/* Initialize the contents of the key. */
var keyContents = [{"text": "Unexpanded nodes with children", 
				    "circleSize": node_radius, 
				    "circleColor": color({"_children":["rubbish"]}), //pass test node data corresponding to the type o    node you wish to color
				    "circleStrokeColor" : "#3182bd",
				    "class": "node"}, 
				    {"text": "Expanded nodes with children", 
				    "circleSize": node_radius, 
				    "circleColor": color({"children":["rubbish"]}), // "             "
				    "circleStrokeColor" : "#3182bd",
				    "circleClass": "node"}, 
				    {"text": "Nodes with no children", 
				    "circleSize": node_radius, 
				    "circleColor": color({"children":[]}),          // "             "
				    "circleStrokeColor" : "#3182bd",
				    "circleClass": "node"}];

/* Dynamically populate the key element of the demo based on the contents 
   of the keyContents array. */
var drawKey = function (keyContents) { 
	/* Key specific constants */
	var key_elem_height = 21, 
		key_elem_padding = 3,
		key_elem_margin = 15, 
		key_width = 285,
		right = 10, 
		key_title_height = 10,
		key_title_padding = 0,
		key_padding = 5,
		key_title_margin_top = 0, 
		key_title_margin_bottom = 0, 
		key_height = keyContents.length * (key_elem_height + key_elem_padding * 2) + 2 * key_padding + 2 * key_title_padding +  key_title_height + key_title_margin_top + key_title_margin_bottom + key_elem_margin + 10, 
		key_border_radius = 10, 
		svg_height = 2 * (node_radius + node_stroke_width), 
		svg_width = 2 * (node_radius + node_stroke_width);

	/* Populate the key element */
	var key = d3.select("body").append("div")
			    .attr("class", "key tooltip")
			    .attr("title", "Alt-click me to dismiss")
			    .on("click", function () {
			    	if (d3.event && d3.event.altKey)
			    		this.remove();
			    });

    /* Make key draggable, courtesy of jQuery */
	$(".key").draggable();

	key.append("p")
	   .text("Key:")
	   .attr("class", "key_title")
	   .style("padding", key_title_padding + "px")
	   .style("height", key_title_height + "px")
	   .style("text-align", "center")
	   .style("margin", "0px")
	   .style("margin-top", key_title_margin_top + "px")
	   .style("margin-bottom", key_title_margin_bottom + "px");

	for (var i = 0; i < keyContents.length; i++) { 
		var p = key.append("p")
				   .style("margin", key_elem_margin + "px");
					 // .style("position", "relative")
					 // .style("height", key_elem_height.toString() + "px")
					 // .style("padding", key_elem_padding + "px")
					 // .style("margin", "0px");

		p.append("svg")
		   .attr("height", svg_height)
		   .attr("width", svg_width)
		   .style("vertical-align", "middle")
		   .append("circle")//draw circle
		   .attr("cx", node_radius + node_stroke_width)
		   .attr("cy", node_radius + node_stroke_width)
		   .attr("r", keyContents[i].circleSize)
		   .style("fill", keyContents[i].circleColor)
		   .style("stroke", keyContents[i].circleStrokeColor)
		   .attr("class", keyContents[i].circleClass);

		p.append("span")	
		   .style("vertical-align", "middle")
		   // .style("left", key_elem_padding + key_padding + 2 * (node_radius + node_stroke_width) + key_elem_padding + "px")
		   // .style("height", key_elem_height + "px")
		   .style("margin", "0px")
		   .style("margin-left", "5px")
		   .html(keyContents[i].text);
	}

	/* Style the key box */
	key.style("border-radius", key_border_radius.toString() + "px")
	   .style("padding", key_padding.toString() + "px")
	   .style("position", "fixed")
	   .style("top", function() { 
	   	      var top = self.window.innerHeight * 5.0 / 12.0 - key_height / 2.0
	   	      return top.toString() + "px"})
	   .style("right", right.toString() + "px")
	   .style("width", key_width.toString() + "px")
	   .style("height", key_height.toString() + "px");
}

/* Draws the key for the tool on the page*/
drawKey(keyContents); 

/* Inject a 3 second delay before running the code for the main functioning of the program
   to allow the browser to load the information from the local files into the javascript 
   variables for the graph information. *This is janky. Find a way to fix it.* ajax.*/
sleep(100, main);

/** Define functions for use in the script. **/

/* Returns an array of the objects corresponding 
   to a particular node's children, accepting a 
   list of their names. */
var arrayOfChildren = function arrayOfChildren(children) {
	var array = [];
	for (var i = 0; i < dataset2.nodes.length; i++) { 
		for (var j = 0; j < children.length; j++) { //consider replacing with jQuery .contains(?)
			if (dataset2.nodes[i].name == children[j]) 
				array.push(dataset2.nodes[i]);
		}
	}
	return array;
}

/* Returns an array of the objects corresponding to a particular 
   node's child links, accepting the node obj, and a list of their 
   names. */
var arrayOfChildLinks = function arrayOfChildLinks (source, children) { 
	var array = [];
	for (var i = 0; i < dataset2.links.length; i++) { 
		for (var j = 0; j < children.length; j++) { 
			/* Cannot be handled as links in the array tracked by the 
			   force layout as target and source are not populated with 
			   their corresponding objects. */
			var sourceName = dataset2.nodes[dataset2.links[i].source].name;
			var targetName = dataset2.nodes[dataset2.links[i].target].name;
			if (sourceName == source.name && targetName == children[j]) { 
					array.push(dataset2.links[i]);
			}
		}
	}
	return array;
}

/* Returns the child-object from the original 
   dataset corresponding to a particular name. */
var childWithName = function childWithName(name) { 
	for (var i = 0; i < nodes2.length; i++) { 
		if (nodes2[i].name == name) { 
			return dataset2.nodes[i];
		}
	}
	return false;
}

/* Returns the force-layout tracked object 
   corresponding to a particular name. */
var forcedChildWithName = function forcedChildWithName(name) { 
	for (var i = 0; i < dataset.nodes.length; i++) { 
		if (dataset.nodes[i].name == name) {
			return dataset.nodes[i];
		}
	} 
	return false;
}

/* Returns the equivalent degree value in radians. */
var degToRad = function degToRad (degrees) { 
	return degrees * (Math.PI / 180);
}

/* Returns the text associated with the file at the path given in the 
   function's argument. */
var readFile = function (file) { 
    var rawFile = new XMLHttpRequest();
    rawFile.open("GET", file, false);
    var allText = "";
    rawFile.onreadystatechange = function ()
    {
        if(rawFile.readyState === 4)
        {
            if(rawFile.status === 200 || rawFile.status == 0)
            {
                allText = rawFile.responseText;
            } else 
            	return rawFile.status;
        } else 
        	return rawFile.readyState;
    }
    rawFile.send(null);
    return allText;
}

/* Creates a fileViewer for the file found at the path specified in 
   the given argument. */
var createFileViewer = function (pathToFile) { 
	var buttonImg = "resources/Button.png";
	var fileViewer = d3.select("body").append("div")
					 .style("position", "fixed")
					 // .style("width", (self.window.innerWidth / 2.0).toString() + "px")
					 // .style("height", (self.window.innerHeight - 100).toString() + "px")
					 .attr("class", "fileViewer")
					 .style("background-color", "white")
					 .style("right", "20px");

	var fileContainer = fileViewer.append("div")
							    .style("overflow-y", "scroll")
							    // .style("height", fileViewer.style("height"))
							    .attr("class", "fileContainer");
	fileContainer.append("img")
				 .attr("src", buttonImg)
				 .attr("height", "25px")
				 .attr("width", "25px")
				 .on("click", closeHandle)
				 .style("position", "absolute")
				 .style("top", "15px")
				 .style("right", "13px");

	fileContainer.append("h1")
				 .attr("class", "fileContent")
				 .html(extractFileName(pathToFile));

	fileContainer.append("p")
				 .style("white-space", "pre-wrap")
				 .attr("class", "fileContent")
				 // .append("pre") //attempts to make the syntax-highlighter work
				 // .attr("type", "syntaxhighlighter")
				 // .attr("class", "brush : lua")
				 .html(readFile(pathToFile).replace(/</g, "&lt;").replace(/>/, "&gt;")); //("<![CDATA[" + readFile(pathToFile) + "]]"); //CDATA Tag included for syntax highlighter

	var fileViewerHeight = Number(fileViewer.style("height").slice(0, -2)),
		fileViewerWidth = Number(fileViewer.style("width").slice(0, -2));

	if (fileViewerHeight > self.window.innerHeight - 100) {
		fileViewer.style("height", (self.window.innerHeight - 100).toString() + "px");
	    fileContainer.style("height", fileViewer.style("height"));
	}

	if (fileViewerWidth > self.window.innerWidth / 2.0 + 20) { 
		fileViewer.style("width", (self.window.innerWidth / 2.0 + 20).toString() + "px");
		fileContainer.style("height", fileViewer.style("width"));
	}

	fileViewer.style("top", ((self.window.innerHeight - 60 - Number(fileViewer.style("height").slice(0, -2))) / 2.0).toString() + "px");

	$(".fileViewer").draggable();

	SyntaxHighlighter.all();
}

/* Returns the name of the file in the path (assumed to be the characters 
   appended to the path after the last '/'). */
var extractFileName = function (pathToFile) { 	
	return pathToFile.slice(pathToFile.lastIndexOf('/') + 1, pathToFile.length);
}

/* Close handler for source viewer */
var closeHandle = function (source) { 
	d3.selectAll(".fileViewer").remove();
}

/* Restarts the force layout based on the nodes and links it tracks 
   and binds those nodes + links to the screen. */
var restart = function restart() {
  /* Notify the application the layout is no longer frozen */
  layout_frozen = false;

  links = links.data(force.links(), function(d) { return d.source.name + d.target.name });
  links.enter().insert("line", ".node")
  			   .attr("id", function (d) { return d.source.name + d.target.name })
  			   .style("stroke", linkColor)
			   .style("stroke-width", 1)
			   .attr("marker-end", "url(#Triangle)");
  links.exit().remove();

  nodes = nodes.data(force.nodes(), function(d) { return d.name });
  nodes.enter().append("circle")
  			   .style("fill", color)
  			   .style("stroke", nodeStrokeColor)
  			   .attr("r", node_radius)
  			   .attr("id", function(d) { return d.name })
  			   .attr("class", "node")
  			   .on("click", click)
  			   .call(drag);
  nodes.exit().remove();

  text = text.data(force.nodes(), function (d) { return d.name + "t"});
  text.enter().append("text")
  			  .attr("x", -5)
			  .attr("y", "2em")
			  .attr("id", function (d) { return d.name + "t" })
			  .text(function(d) { return d.name; });

  force.start();
  
  /* Unfixes all layout nodes unless they are in the list of persistently fixed nodes */
  unfixAllLayoutNodes();
}

/* Returns the index of the node with the given 
   name.  */
var indexOfNode = function indexOfNode (name) { 
	for (var i = 0; i < dataset.nodes.length; i++) { 
		if (dataset.nodes[i].name == name)
			return i;
	}
	return -1;
}

/* Returns the index of the link matching the 
   given names of the source and target. */
var indexOfLink = function indexOfLink (source, target) { 
	for (var i = 0; i < dataset.links.length; i++) { 
		if (dataset.links[i].source.name == source &&
			 dataset.links[i].target.name == target)
			return i;
	}
}

/* Updates all of the links and nodes associated with a 
   force directed layout based on the properties computed 
   for these nodes + links by the layout. */
var tick = function () {
	var x; //variable for the x position of the node in question
	links.attr("x1", function(d) { return d.source.x; })
	     .attr("y1", function(d) { return d.source.y; })
	     .attr("x2", function(d) { return d.target.x; })
	     .attr("y2", function(d) { return d.target.y; });

	nodes.attr("cx", function(d) { return d.x; }) //var x = updateSvgX(d.x, d.name); console.log(x); 
	     .attr("cy", function(d) {  
	     	updateSvg(d.x, d.y); 
	     	return d.y;
	      });//var y = updateSvgY(d.y, d.name); console.log(y); 

	text.attr("transform", transform);
}

/* Return the appropriate value for the transform attribute of a node 
   to move it to its new position. */
var transform = function (d) {
	return "translate(" + d.x + "," + d.y +")";
}

/* Updates SVG if node is too far to left or bottom of svg */
var updateSvg = function (x, y) { 
	var windowX = svg.attr("width"),
		windowY = svg.attr("height"); 

	if (x > windowX) 
		svg.attr("width", x + node_radius + node_stroke_width);
	else if (y > windowY)
		svg.attr("height", y + node_radius + node_stroke_width);
}

/* Recursively call collapse children on all of source's expanded children */
var collapseChildren = function collapseChildren(source_master, source, duration, depth) { 
	console.log("I am now collapsing children for: ");
	console.log(source.name);

	/* Base case */
	if (!source.children || depth >= 8) return;

	/* Recursively call collapseChildren on all the expanded children of a node.*/
	for (var i = 0; i < source.children.length; i++) { 
		var child = forcedChildWithName(source.children[i]);
		if (!moreSuperiorParentsOnScreen(child.name, source_master.name) && child.children) {//children not already collapsed and does not have any owning children still on screen
			collapseChildren(source_master, child, duration, depth + 1);
		}
	}

	/* Calculate the new number of links that will be on the screen */
	var newL = l - source.children.length;
	var newN = n - source.children.length;

	/* A boolean to indicate whether the layout has been 
	   restarted */
	restarted = false; 

	/* Select the appropriate DOM elements one by 
	   one and collapse them */
	for (var i = 0; i < source.children.length; i++) { 
		if (moreSuperiorParentsOnScreen(source.children[i], source.name)) { 
			newN++; //increase the new number of nodes the framework is expecting to appear
					//on the screen to adjust for nodes that won't actually be contracted
		} else {//Consider replacing with a more efficient implementation of array.contains(?) (also keep an array of names of displayed/visible nodes) 
			/* Collapse the child nodes */
			svg.select("#" + source.children[i])
			   .transition()
			   .duration(duration)	
			   .attr("cx", source_master.x)
			   .attr("cy", source_master.y)
			   .attr("r", 1e-6)
			   .each("end", function () { 
			   	  	/* Remove child node from page */
					this.remove();

				   	/* Calculate the new number of nodes and links 
				      on the screen */
					l = svg.selectAll("line")[0].length;
			       	n = svg.selectAll("circle")[0].length;

			      	/* If all of the child links and nodes have been removed
			      	   restart the layout */
			      	if (newL == l && newN == n && !restarted) {

			      		restarted = true;
			      		restart();
			      	}
			   });

			/* Collapse the text label */
			svg.select("#" + source.children[i] + "t")
			   .remove();

			/* Remove the child node from the set of nodes 
			   tracked by the force layout. */
			force.nodes().splice(indexOfNode(source.children[i]), 1);

			/* If the child was in the set of traversed nodes, remove it 
			   from the set. */
		    var indxOfChild = traversed.indexOf(source.name);
		    if (indxOfChild != -1) traversed.splice(indxOfChild, 1); 
		}

		/* Collapse the child link */
		svg.select("#" + source.name + source.children[i])
			   .transition()
			   .duration(duration)
			   .attr("x1", source_master.x)
			   .attr("y1", source_master.y)
		       .attr("x2", source_master.x)
		       .attr("y2", source_master.y)
		       .style("opacity", 1e-6)
		   	   .each("end", function () { 
		   	  	 /* Remove child link from page */
				 this.remove();

			   	 /* Calculate the new number of nodes and links 
			       on the screen */
				 l = svg.selectAll("line")[0].length;
		       	 n = svg.selectAll("circle")[0].length;

		      	 /* If all of the child links and nodes have been removed
		      	    restart the layout */
		      	 if (newL == l && newN == n && !restarted) {
		      	 	restarted = true;	
		      	 	restart();
		      	 }
		   	   });

		/* Remove the link from the set of links 
		   tracked by the force layout. */
		force.links().splice(indexOfLink(source.name, source.children[i]), 1);

	}

	/* Set the children field to null, to indicated non-expanded children.*/
	source._children = source.children;
	source.children = false;

	/* Recolor source to indicate collapsed children. */
	svg.selectAll("#" + source.name)
	   .style("fill", color);

	/* Recolor source node.ss*/
	if (depth == 0) 
		svg.select("#" + source_master.name).style("fill", color);
}

/* Expand children; at this point: one level at a time. */
var expandChildren = function expandChildren(source, duration) { 
	/* Calculate the new number of links that will be on the screen 
	   before layout-refresh */
	var newL = l;
	var newN = n;

	/* Initialize an array of all children who should be added to 
	   the nodes + links in the force layout after the nodes are 
	   drawn and removed from the page */
	var childNodes = [];
	var childLinks = [];

	/* Calculate positioning information for expanding nodes */
	var r = 90;
	var theta = 2 * Math.PI / source._children.length;

	restarted = false;

	/* Draw the children on the screen, on top of their parent */
    var nodeEnter = svg.selectAll("circle")
				    .data(arrayOfChildren(source._children), function (d) {return d.name})
					.enter()
					.append("circle")
					.style("fill", color)
					.style("stroke", nodeStrokeColor)
					.attr("r", 1e-6)
				    .attr("id", function(d) { return d.name })
				    .attr("class", "node")
				    .attr("cx", source.x)
				    .attr("cy", source.y)
				    .style("opacity", 1)
					.on("click", click)
					.call(drag);

	/* Draw links beginning and ending at their source. */
	var linkEnter = svg.selectAll("line")
					.data(arrayOfChildLinks(source, source._children), function (d) { 
						/* d3 is doing something weird here where some of the d.target/source attrs 
						   are objects and some are numbers (as per the array returned by the array 
						   ofChildLinks method). This if statement checks that dataset2.nodes[d.source/target]
						   is defined. */
						if (dataset2.nodes[d.source] && dataset2.nodes[d.target].name)
							return dataset2.nodes[d.source].name + dataset2.nodes[d.target].name;
					})
					.enter()
					.insert("line", ".node")
					.attr("r", node_radius)
			        .style("stroke", linkColor)
			        .style("stroke-width", 1)
			        .style("opacity", 1e-6)
					.attr("id", function (d) { return dataset2.nodes[d.source].name + dataset2.nodes[d.target].name })
					.attr("x1", source.x)
					.attr("y1", source.y)
					.attr("x2", source.x)
					.attr("y2", source.y)
					.attr("marker-end", "url(#Triangle)");

	/* Expand nodes & links one by one */
	for (var i = 0; i < source._children.length; i++) {
		/* Check if  child exists on screen */
	    var child = forcedChildWithName(source._children[i]);

	    if (child) { //If it does, expand the appropriate link to it
	   	console.log("Here's the child!");
	   	console.log(child);

			/* Expand link */
			svg.select("#" + source.name + source._children[i])
			   .transition()
			   .duration(duration)
			   .style("opacity", 0.01)
			   .attr("x2", function () { return child.x; })
			   .attr("y2", function () {
			   		childLinks.push({source: source, target: child});
				   	return child.y;
			   })
			   .each("end", function () { 
			   	 /* Remove this from the screen. Adding to the force layout (etc) 
			   	    has already been done above, in animating the nodes. */
			   	 this.remove();

		   	 	 /* Calculate the new number of nodes and links 
				    on the screen */
				 l = svg.selectAll("line")[0].length;
		      	 n = svg.selectAll("circle")[0].length;

			   	 if (newL == l && newN == n && !restarted) {
			   	 	restarted = true;
			      		/* Add all data for added child nodes to set 
			      		   tracked by the force layout */
			      		for (var i = 0; i < childNodes.length; i++) 
							force.nodes().push(childNodes[i]);

			      		/* Add all data for add child links to set 
			      		   tracked by the force layout */
			      		for (var i = 0; i < childLinks.length; i++)
			      			force.links().push(childLinks[i])

			      		/* Restart the force layout */
			      		restart();
			   	 }
			   });
	    } else { //If it doesn't, expand the node corresponding to it, along with the corresponding link
	    	child = childWithName(source._children[i]); 

	    	setChildrenAsCollapsed(child);

	    	/* Expand child node */
			svg.select("#" + source._children[i])
			    .transition()
				.duration(duration)
				.attr("r", node_radius)
				.attr("cx", function () {
					child.x = source.x + r * Math.sin(theta * i);
					return child.px = source.x + r * Math.sin(theta * i);
				})
				.attr("cy", function () { 
					child.y = source.y + r * Math.cos(theta * i);
					child.py = child.y;
					/* Add the child node and link to the child nodes and links. */
		  			childNodes.push(child);
					childLinks.push({source: source, target: child});

				 	return source.y + r * Math.cos(theta * i);
				})	
				.style("opacity", 1)
				.each("end", function () { 
					/* Remove it from the screen */
					this.remove();

					/* Calculate the new number of nodes and links 
					   on the screen */
					l = svg.selectAll("line")[0].length;
			      	n = svg.selectAll("circle")[0].length;

			      	/* If all of the child links and nodes have been removed
			          restart the layout */
			      	if (newL == l && newN == n && !restarted) {
			      		restarted = true;
			      		/* Add all data for added child nodes to set 
			      		   tracked by the force layout */
			      		for (var i = 0; i < childNodes.length; i++) 
							force.nodes().push(childNodes[i]);

			      		/* Add all data for add child links to set 
			      		   tracked by the force layout */
			      		for (var i = 0; i < childLinks.length; i++)
			      			force.links().push(childLinks[i])

			      		/* Restart the force layout */
			      		restart();
			      	}
				});

			/* Expand link */
			svg.select("#" + source.name + source._children[i])
			   .transition()
			   .duration(duration)
			   .style("opacity", 0.6)
			   .attr("x2", function () { return source.x + r * Math.sin(theta * i) })
			   .attr("y2", function () { 
			   	/* Link has already been added (to the set tracked by the force 
			   	   layout when adding nodes above) */
			   	return source.y + r * Math.cos(theta * i);
			   })
			   .each("end", function () { 
			   	 /* Remove this from the screen. Adding to the force layout (etc) 
			   	    has already been done above, in animating the nodes. */
			   	 this.remove();

		   	 	 /* Calculate the new number of nodes and links 
				    on the screen */
				 l = svg.selectAll("line")[0].length;
		      	 n = svg.selectAll("circle")[0].length;

			   	 if (newL == l && newN == n && !restarted) {
			   	 	restarted = true;
			      		/* Add all data for added child nodes to set 
			      		   tracked by the force layout */
			      		for (var i = 0; i < childNodes.length; i++) 
							force.nodes().push(childNodes[i]);

			      		/* Add all data for add child links to set 
			      		   tracked by the force layout */
			      		for (var i = 0; i < childLinks.length; i++)
			      			force.links().push(childLinks[i])

			      		/* Restart the force layout */
			      		restart();
			   	 }
			   });
	    }
	}

	source.children = source._children;

	source._children = false;

	svg.select("#" + source.name).style("fill", color);

}

/* Define what happens to a node on a click event */
var click = function click(source) { 
	console.log("Hey");
	console.log("Here I am:");
	console.log(source);

	/* Prevent double clicks */
	var current_time = (new Date).getTime(); //number of milliseconds since Jan 1, 1970
	if (current_time - last_click < single_click_timeout){
		console.log("click prevented!");
		return;
	}
	if (d3.event.defaultPrevented) return; 

	/* Select a duration. */
	var duration = d3.event && d3.event.altKey ? 5000 : 500;

	/* Fix a specified node */
	if (d3.event && d3.event.altKey) {
		source.fixed ? source.fixed = false : source.fixed = true;
		var index = fixed.indexOf(source.name);

		if (source.fixed && index == -1) //should be fixed and not in the array
			fixed.push(source.name);
		else if (!source.fixed && index != -1)//should be unfixed and in the array
			fixed.splice(index, 1);

		return;
	}

	if (d3.event && d_key_pressed) { //d key
		createFileViewer(file_to_path_mapping[source.name]);
		return;
	}

	/* Calculate the number of links and nodes on the screen. */
	l = svg.selectAll("line")[0].length;
	n = svg.selectAll("circle")[0].length;

	/* Fix all the nodes in the layout, so as to allow for smooth 
	   collapse and expansion. Note: Nodes will be unfixed in the 
	   restart function. */
	fixAllLayoutNodes();

	/* Add source node to the list of traversed nodes (if not added) */
	if (traversed.indexOf(source.name) == -1)
		traversed.push(source.name);

	/* Remove any nodes that are not superior parents to the clicked node from 
	   the traversed list (and update the clicked node.) */
	if (source.parents.indexOf(last_clicked) == -1 && traversed.indexOf(last_clicked)
		 != -1 && last_clicked != source.name)
		traversed.splice(traversed.indexOf(last_clicked), 1);

	/* Update the last_clickked node. */
	last_clicked = source.name;

	/* Dims all nodes that have not been traversed by clicks. */
	dimUndiscoveredNodes(source);

	/* Collapse children. */
	if (source.children && source.children.length > 0) { 
		collapseChildren(source, source, duration, 0);
	/* Expand children */
	} else if (source._children && source._children.length > 0) { //If children collapsed
		expandChildren(source, duration);
	} else { 
		restart();
	}
	last_click = current_time;
};

/* Fixes all nodes in the layout. */
var fixAllLayoutNodes = function (fixPersistently) { 
		for (var i = 0; i < force.nodes().length; i++) { 
			if (fixPersistently)
				temp_fixed.push(force.nodes()[i].name);
 		force.nodes()[i].fixed = true;
	}
}

/* Unfix layout nodes. */
var unfixAllLayoutNodes = function () { 
	for (var i = 0; i < force.nodes().length; i++) { 
		if (fixed.indexOf(force.nodes()[i].name) == -1 && temp_fixed.indexOf(force.nodes()[i].name) == -1)  //if node not in the list of fixed nodes
			force.nodes()[i].fixed = false;
	}
}

/* Dims all nodes that have not been traversed by clicks and are not part of the original 
   set of diffed nodes. */
var dimUndiscoveredNodes = function (source, collapse) { 
	/* Go through all nodes & links; reduce their opacity to 0.5 unless they are 
	on the path of traversed nodes or the children of the last expanded node. */
    var nodes = svg.selectAll("circle")
			   .style("opacity", function (d) { 
			   		return (traversed.indexOf(d.name) != -1 || isChildOf(d.name, source) || d._originalNode) ? "1.0" : "0.5";
			   	});

    var links = svg.selectAll("line")
    			.style("opacity", function (d) { 
    				return (traversed.indexOf(d.source.name && d.target.name) != -1 || isChildOf(d.name, source)) 
    						 ? "1.0" : "0.5";
    			});

	var text = svg.selectAll("text")
			  .style("opacity",  function (d) { 
			   		return (traversed.indexOf(d.name) != -1 || isChildOf(d.name, source) || d._originalNode) ? "1.0" : "0.5";
			   	});
}

/* Returns whether the node represented by the second parameter has a child 
   by the name of the first parameter. */
var isChildOf = function (childName, source) { 
	return source.children ? source.children.indexOf(childName) != -1 
	                       : source._children.indexOf(childName) != -1;
}

function main() { 
	/* Setup entire node and link sets. */    
	nodes2 = dataset2.nodes; 
	links2 = dataset2.links;

	/* Start the force layout */
	force = d3.layout.force()
					 .nodes(dataset.nodes)
					 .links(dataset.links)
					 .size([w, h])
                     .linkDistance([90])
                     .charge([-2000])   
					 .on("tick", tick)
					 .start();

	/* Define the drag handler, with special conditions on dragstart*/
	drag = force.drag().on("dragstart", dragstart);

	/* Define the triangle marker. */
	svg.append("defs").selectAll("marker")
	   .data(["Triangle"])
	   .enter()
	   .append("marker")
	   .attr("id", function (d) {return d})
	   .attr("viewBox", "0 -5 10 10")
	   .attr("refX", refX)
	   .attr("refY", refY)
	   .attr("markerWidth", markerHeight)
	   .attr("markerHeight", markerWidth)
	   .attr("orient", "auto")
	   .append("path")
	   .attr("d", path);

	/* Put all the links on the canvas */
	links = svg.selectAll("line")
        .data(dataset.links, function (d) { return d.source.name + d.target.name })
        .enter() 
        .insert("line", ".node")
        .style("stroke", linkColor)
        .style("stroke-width", 1)
        .attr("id", function (d) { return d.source.name + d.target.name  } )
        .attr("marker-end", "url(#Triangle)");

    /* Put all the nodes on the canvas */
	nodes = svg.selectAll("circle")
        .data(dataset.nodes, function (d) {return d.name})
        .enter()
        .append("circle")
        .style("fill", color)
        .style("stroke", nodeStrokeColor)
        .attr("r", node_radius)
        .attr("id", function(d) {return d.name})
        .attr("class", "node")
        .on("click", click)
        .call(drag);

    text = svg.append("g").selectAll("text")
			    .data(force.nodes(), function (d) { return d.name + "t"})
			   .enter().append("text")
			    .attr("x", -5)
			    .attr("y", "2em")
			    .attr("id", function (d) { return d.name + "t" })
			    .text(function(d) { return d.name; });

    /* Calculate the number of links and nodes 
       on the string. */
    l = links[0].length;
   	n = nodes[0].length;
}

/* A superior parent relationship is one that is defined between a node, its child, and 
   another parent of the child. Note that this means the child must have at least two parents. 
   A node is a superior parent of its child if it is not, itself, a progeny of the other parent 
   in question. This function determines if there are any superior parents of a child (with respect
   to another parent, whose name is passed as the second argument.)
 */
var moreSuperiorParentsOnScreen = function (childName, parentName) {
	var child = childWithName(childName);
	var noParentsOnScreen = true;
	console.log("***");
	console.log("Checking for ");
	console.log(child);
	console.log("Ignoring");
	console.log(parentName);

	if (!child) //second and third checks represent the base case(s) of finding  
		return false;//no parent other than the node originally causing the collapse

	for (var i = 0; i < child.parents.length; i++) {
		var parent = forcedChildWithName(child.parents[i]);
		if (parent && parent.name != parentName && parent.children   //check parent is not collapsed and that it has parents
				&& moreSuperiorParentsOnScreen(parent.name, parentName)) {   //other than the original parent causing the collapse
			console.log("Hey, I found a parent for " + childName + "!");
			console.log(parent);

			console.log("Here's the parent name I was ignoring: " + parentName);
			console.log("Here's the name of the parent I found: " + parent.name); 
			return true;
		}
		if (parent) noParentsOnScreen = false; //if found a parent at all, keep track
	}

	if (noParentsOnScreen) {//Implies the parent whose name is passed as the second parameter
		console.log("Found no parents on screen for " + childName + "!");
		return true;       //cannot be reached from the original node (vacuous truth)
	} else {
		console.log("Found no more parents on screen than specified one for " + childName + "!");
		return false;
	}	
}

/* Sets children as collapsed. */
var setChildrenAsCollapsed = function (source) { 
	if (!source._children)
		source._children = source.children;
	source.children = false;
}

/* Sleep function */
function sleep(millis, callback) { 
	setTimeout(function() 
		{ callback(); }, 
	millis);
}
