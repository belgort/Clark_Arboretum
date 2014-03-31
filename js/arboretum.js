$(document).ready(function(){

     var canvas  = $('#map_canvas');
     
     // Set to true to show tree id in info popup
     var debug   = false;
     var overlay = true;
     var intro = true;
     var loadingInterval = 0;
     
     // Find out if the browser has already shown the intro box
     if ( typeof(sessionStorage) !== "undefined" )
     {
          if ( sessionStorage.arboretumIntro ) {
               intro = false;
          }
     }
     
     // Unhide the intro if its set to show
     if ( intro ) 
     {
          $('#intro-box').show();
     }
     else 
     {     
          $('#map-controls').show();
     }
     
     // Stretch the map canvas to the entire width and height of the page
     function setCanvasSize()
     {
          canvas.width($(window).innerWidth());
          canvas.height($(window).innerHeight());
     }
     
     // Call the map stretching function on page load
     setCanvasSize();
     
     // VARIABLES //
     // Filter Variables
     var evergreen = true;
     var decidious = true;
     
     // Other Variables
     var trees = [];
     var currentZoom = 16; 
     var treeIcons = "small";
     var pBrowsing = false;
     
     // Directory where Images are located
     var imgDir      = 'img/';
     // Location of the PHP File that returns map tiles.  The PHP Script returns 
     // the transparent .png file if the requested map tile is not in our set.
     var tileChecker = 'php/tileChecker.php';
     // File path for tree photos
     var photoDir    = 'img/trees/';
          
     //-------------//
     //  Map Stuff  //
     //-------------////////////////////////////////////////////////////////////     
     
     // Center of the initial map
     var center;
     if ( $(window).innerWidth() < 768 ) {
          center = new google.maps.LatLng(45.635557,-122.651564);
     }
     else {
          center = new google.maps.LatLng(45.635872,-122.653924);
     }
     
     // Boundary around map that restricts dragging the map past.  Also is used
     // to check if a user is near the college.             
     var dragBounds = new google.maps.LatLngBounds(
          new google.maps.LatLng(45.631926,-122.660426),
          new google.maps.LatLng(45.638902,-122.647702)
     );      

     // Overlay Tiles
     var arboretumOverlayOptions = {
          getTileUrl: function(coord, zoom) {
               var normalizedCoord = getNormalizedCoord(coord, zoom);
               if (!normalizedCoord) {
                    return null;
               }
                    var bound = Math.pow(2, zoom);
                    return tileChecker + '?z=' + zoom + '&x=' + normalizedCoord.x + '&y=' + (bound - normalizedCoord.y - 1);
          },
          tileSize: new google.maps.Size(256, 256),
          maxZoom: 20,
          minZoom: 16,
          name: "CC-Arboretum"
     };
     
     // Attach a new map type to the tile options
     var arboretumMapType = new google.maps.ImageMapType(arboretumOverlayOptions);
              
     var map_canvas = document.getElementById('map_canvas');
     
     var mapOptions = {
          backgroundColor: "transparent",
          zoom: 16,
          minZoom: 16,
          maxZoom: 20,
          center: center,
          streetViewControl: false,
          mapTypeControl: false,
          navigationControl: false,
          mapTypeId: google.maps.MapTypeId.ROADMAP
     }
     var map = new google.maps.Map(map_canvas, mapOptions);
     
     /********************/
     /* TO TEST NEW MAPS */
     /*************************************************************************/
     
     /*  // <--- Remove the first slash and asterix to enable this section of code      
     // Overlay Full Image for testing
	var imageBounds = new google.maps.LatLngBounds(
         new google.maps.LatLng(45.631761,-122.661585),
         new google.maps.LatLng(45.638885,-122.64770));
         
     // Map Tiler Coordinates (N S E W): 45.638885 45.631761 -122.64770 -122.661585
         
     var overlayOptions = {
          opacity: 0.5
     }
		
	var clarkMap = new google.maps.GroundOverlay(
          // Add URL of map overlay to test in the quotes below
         '',
         imageBounds, overlayOptions);
     clarkMap.setMap(map);
     //*/
     
     /*************************************************************************/
     
     // Map Styles - Sets the Background Google Map to hide all styles
     var styles = [ { "stylers": [ { "visibility": "off" } ] } ];
     var noStyles = [ { } ];     
     map.setOptions({styles: styles});
     
     // Overlay the tiles on TOP of the Google Map
     map.overlayMapTypes.insertAt(0, arboretumMapType); 
     
     // Let the map load when the user arrives, then notify them its ready to use
     google.maps.event.addListenerOnce(map, 'tilesloaded', function(){
          
          function mapReady()
          {
               $('#map-loading').html("MAP READY");
               
               function clearLoadMessage() 
               {
                    $('#map-loading').slideUp();
               }
               
               var clearReady = setTimeout(clearLoadMessage, 2500);
          }
          var allReady = setTimeout(mapReady, 1000);
     });
     
     // Normalizes the coords that tiles repeat across the x axis (horizontally)
     // like the standard Google map tiles. << Taken from Google Maps API documentation >>
     function getNormalizedCoord(coord, zoom) {
          var y = coord.y;
          var x = coord.x;
     
          // tile range in one direction range is dependent on zoom level
          // 0 = 1 tile, 1 = 2 tiles, 2 = 4 tiles, 3 = 8 tiles, etc
          var tileRange = 1 << zoom;
     
          // don't repeat across y-axis (vertically)
          if (y < 0 || y >= tileRange) {
               return null;
          }
     
          // repeat across x-axis
          if (x < 0 || x >= tileRange) {
               x = (x % tileRange + tileRange) % tileRange;
          }
     
          return {
               x: x,
               y: y
          };
     }     

     // Dont allow scrolling the map outside of the Clark College area
     google.maps.event.addListener(map, 'dragend', function() {
     
          if (dragBounds.contains(map.getCenter())) {
               return;
          }

          var c = map.getCenter(),
              x = c.lng(),
              y = c.lat(),
              maxX = dragBounds.getNorthEast().lng(),
              maxY = dragBounds.getNorthEast().lat(),
              minX = dragBounds.getSouthWest().lng(),
              minY = dragBounds.getSouthWest().lat();

          if (x < minX) x = minX;
          if (x > maxX) x = maxX;
          if (y < minY) y = minY;
          if (y > maxY) y = maxY;

          map.setCenter(new google.maps.LatLng(y, x));
     });

     loadTrees();

     //----------------//
     //  Marker stuff  //
     //----------------/////////////////////////////////////////////////////////
     
     // Large Sized Marker Images
     var largeDeciduousMarker = {
          url: imgDir + 'markers/d-marker-large.png',
          size: new google.maps.Size(31, 44),
          origin: new google.maps.Point(0,0),
          anchor: new google.maps.Point(15, 44)
     };
     var largeEvergreenMarker = {
          url: imgDir + 'markers/e-marker-large.png',
          size: new google.maps.Size(31, 44),
          origin: new google.maps.Point(0,0),
          anchor: new google.maps.Point(15, 44)
     };
     // Medium Sized Marker Images
     var mediumDeciduousMarker = {
          url: imgDir + 'markers/d-marker-med.png',
          size: new google.maps.Size(16,22),
          origin: new google.maps.Point(0,0),
          anchor: new google.maps.Point(8,22)
     };
     var mediumEvergreenMarker = {
          url: imgDir + 'markers/e-marker-med.png',
          size: new google.maps.Size(16,22),
          origin: new google.maps.Point(0,0),
          anchor: new google.maps.Point(8,22)
     };
     // Small Sized Marker Images
     var smallDeciduousMarker = {
          url: imgDir + 'markers/d-marker-small.png',
          size: new google.maps.Size(8,11),
          origin: new google.maps.Point(0,0),
          anchor: new google.maps.Point(4,11)
     };
     var smallEvergreenMarker = {
          url: imgDir + 'markers/e-marker-small.png',
          size: new google.maps.Size(8,11),
          origin: new google.maps.Point(0,0),
          anchor: new google.maps.Point(4,11)
     };
     // Marker Shadows
     var largeShadow = {
          url: imgDir + 'markers/marker-shadow-large.png',
          size: new google.maps.Size(42,37),
          origin: new google.maps.Point(0,0),
          anchor: new google.maps.Point(2,34)
     };
     var mediumShadow = {
          url: imgDir + 'markers/marker-shadow-med.png',
          size: new google.maps.Size(21,19),
          origin: new google.maps.Point(0,0),
          anchor: new google.maps.Point(0,17)
     };
     var smallShadow = {
          url: imgDir + 'markers/marker-shadow-small.png',
          size: new google.maps.Size(11,9),
          origin: new google.maps.Point(0,0),
          anchor: new google.maps.Point(0,9)
     }; 
     // User Marker (for find me)
     var largeUserMarker = {
          url: imgDir + 'markers/u-marker-large.png',
          size: new google.maps.Size(31, 44),
          origin: new google.maps.Point(0,0),
          anchor: new google.maps.Point(15, 44)
     };
     var mediumUserMarker = {
          url: imgDir + 'markers/u-marker-med.png',
          size: new google.maps.Size(16,22),
          origin: new google.maps.Point(0,0),
          anchor: new google.maps.Point(8,22)
     };
     var smallUserMarker = {
          url: imgDir + 'markers/u-marker-small.png',
          size: new google.maps.Size(8,11),
          origin: new google.maps.Point(0,0),
          anchor: new google.maps.Point(4,11)
     };

     // Load the tree information from the PHP File via AJAX
     function loadTrees()
     {
          $.ajax({
               url:"php/trees.php",
               data: {
                    'initialize': 'go' 
               },
               dataType: 'json', 
               success: function(data) {

                    $.each(data, function(index, value) {

                         var markerLocation = new google.maps.LatLng(this.latitude, this.longitude);
                         
                         var iconImg;

                         // Set the tree markers depending on tree type
                         if ( this.treeType === 'd') {
                              largeMarker  = largeDeciduousMarker;
                              mediumMarker = mediumDeciduousMarker;
                              smallMarker  = smallDeciduousMarker;
                         }
                         else if ( this.treeType === 'e' ) {
                              largeMarker  = largeEvergreenMarker;
                              mediumMarker = mediumEvergreenMarker;
                              smallMarker  = smallEvergreenMarker;
                         }

                         // Load in all the properties to the marker object
                         marker = new google.maps.Marker({
                              treeID: index,
                              position: markerLocation,
                              largeMarker: largeMarker,
                              mediumMarker: mediumMarker,
                              smallMarker: smallMarker,
                              largeShadow: largeShadow,
                              mediumShadow: mediumShadow,
                              smallShadow: smallShadow,
                              treePhoto: photoDir + this.imageLink,
                              treeType: this.treeType,
                              commonGenus: this.commonGenus,
                              commonName: this.commonName,
                              latinFamily: this.latinFamily,
                              genus: this.genus,
                              species: this.species,
                              animation: google.maps.Animation.DROP                              
                         });

                         // Add marker to trees array
                         trees.push(marker);
                         
                    });

                    // When all markers are loaded, give them click events
                    setMarkers();
                    
                    // Now adjust the icon for the zoom level
                    changeMarkerIcons();
                                        
               },
               // If there was an error loading the PHP file this message will display
               error: function(textStatus, errorThrown) {
                         alert('Error Loading Tree Information File\n\n' + textStatus + "\n" + errorThrown);
               }
          });
     }

     // Runs through all the markers and adds a click event for the tree info pop up
     function setMarkers()
     {
          var timer = 0;

          for ( i = 0; i < trees.length; i++ ) {
               
               timer += 1000;
               // Set the Click events for the marker
               google.maps.event.addListener(trees[i], 'click', function() {
                    
                    // Determine box color
                    if ( this.treeType === 'e' ) {
                         $('#info-title-stripe').removeClass("coral-title-stripe");
                         $('#info-title-stripe').addClass("teal-title-stripe");
                         $('#tree-info-content').removeClass("deciduous-info");
                         $('#tree-info-content').addClass("evergreen-info");
                         
                         if ( ! $('.tree-info-info').hasClass("teal-info-mobile") ) 
                         {
                              $('.tree-info-info').removeClass("coral-info-mobile");
                              $('.tree-info-info').addClass("teal-info-mobile");
                         }                             
                    }
                    else {// Its a deciduous
                         $('#info-title-stripe').removeClass("teal-title-stripe");
                         $('#info-title-stripe').addClass("coral-title-stripe");
                         $('#tree-info-content').removeClass("evergreen-info");
                         $('#tree-info-content').addClass("deciduous-info");
                         
                         if ( ! $('.tree-info-info').hasClass("coral-info-mobile") ) 
                         {
                              $('.tree-info-info').removeClass("teal-info-mobile");
                              $('.tree-info-info').addClass("coral-info-mobile");
                         }
                    }
                    
                    // Clear out old data before showing
                    $('#tree-info-title').html("");
                    $('#tree-info-genus').html("");
                    $('#tree-info-species').html("");
                    
                    // If tree ids are on, show them too
                    if ( debug === true )
                    {
                         $('#tree-info-id').html("");
                    }
                    
                    $('#info-box').fadeIn();
                    
                    var treeName    = this.commonName;
                    var treeGenus   = "Genus: " + this.genus;
                    var treeSpecies = "Species: " + this.species;
                    var treeId      = this.treeID;
                    
                    // Display the loading image whie the photo loads
                    $("#tree-info-image").html('<img id="loading-image" src="img/loading.gif" alt="loading" />');
                    
                    // Start loading the image
                    var treePhoto = new Image();

                    treePhoto.src = this.treePhoto;
                    
                    treePhoto.alt = this.name;

                    // When the image has loaded, show everything
                    treePhoto.onload = function()
                    {
                        $('#tree-info-image').html(treePhoto);
                        $('#tree-info-title').html(treeName);
                        $('#tree-info-genus').html(treeGenus);
                        $('#tree-info-species').html(treeSpecies);
                        if ( debug === true ) {
                              $('#tree-info-id').html(treeId);
                        }

                    }               

               });

               // Add the marker to the map
               trees[i].setIcon(trees[i].smallMarker);
               trees[i].setShadow(trees[i].smallShadow);
               trees[i].setMap(map); 
               
          }
          
     }
     
     // Change the markers on different zoom levels
     function changeMarkerIcons(iconType)
     {
          if ( iconType === "large" ) {
               for ( var i = 0; i < trees.length; i++ ) {
                    trees[i].setIcon(trees[i].largeMarker);
                    trees[i].setShadow(trees[i].largeShadow);        
               }
               // Scale User Marker 
               userMarker.setIcon(userMarker.largeMarker);
               userMarker.setShadow(userMarker.largeShadow); 
               
               treeIcons = "large";
          }
          else if ( iconType === "medium" ) {
               for ( var i = 0; i < trees.length; i++ ) {
                    trees[i].setIcon(trees[i].mediumMarker);
                    trees[i].setShadow(trees[i].mediumShadow);         
               }
               // Scale User Marker 
               userMarker.setIcon(userMarker.mediumMarker);
               userMarker.setShadow(userMarker.mediumShadow);
                    
               treeIcons = "medium";
          }
          else if ( iconType === "small" ) {
               for ( var i = 0; i < trees.length; i++ ) {
                    trees[i].setIcon(trees[i].smallMarker);
                    trees[i].setShadow(trees[i].smallShadow);        
               }
               // Scale User Marker 
               userMarker.setIcon(userMarker.smallMarker);
               userMarker.setShadow(userMarker.smallShadow); 
               
               treeIcons = "small";
          }    
     }    
     
     //--------------//
     //  Zoom stuff  //
     //--------------///////////////////////////////////////////////////////////
     
     // Highlight the tick for the initial zoom level
     $('#zoom-16').addClass('active-tick');
     
     // Respond to the Zoom IN UI Click
     $('#zoom-in').click(function()
     {               
          if ( map.getZoom() < 20 ) {
               map.setZoom(currentZoom + 1);
          }          
     });
     
     // Respond to the Zoom OUT UI Click
     $('#zoom-out').click(function()
     {              
          if ( map.getZoom() > 15 ) {
               map.setZoom(currentZoom - 1);
          }                        
     });
     
     // Listen for the map zoom change and set the current zoom and change ticker
     google.maps.event.addListener(map, 'zoom_changed', function()
     {          
          currentZoom = map.getZoom();
                    
          setZoomTicker();
          
          if ( currentZoom > 18 && treeIcons !== "large" ) {
               changeMarkerIcons("large");    
          }
          else if ( currentZoom > 16 && currentZoom < 19 && treeIcons !== "medium" ) {
               changeMarkerIcons("medium");
          }
          else if ( currentZoom === 16 && treeIcons !== "small" ) {
               changeMarkerIcons("small");
          }
     });
     
     // Change the ticks on the custom zoom UI after a zoom event
     function setZoomTicker()        
     {          
          $('.scale-tick').each(function()
          {    
               $(this).removeClass('active-tick');
          });                            
          
          $('#zoom-' + currentZoom).addClass('active-tick');
     } 
     
     //-------------------//
     //  Filtering stuff  //
     //-------------------//////////////////////////////////////////////////////
     
     // Show All Trees 
     $('#show-all').click(function(e) 
     {          
          e.preventDefault();
          // Show all markers
          for ( i = 0; i < trees.length; i++ ) {
               trees[i].setVisible(true);
          }
          
          $('#search-box').fadeOut();          
     });
     
     // Initial Checkbox Reset
     resetCheckboxes();
     
     // Set all Filter checks back to true
     function resetCheckboxes()
     {
          $('input[type=checkbox]').each(function()
          {
               $(this).prop('checked', true);
          });
     }
     
     // Info Box Control
     $('#close-info').click(function()
     {
          $('#info-box').fadeOut(function()
          {
               // Clear out the info when the box is closed
               $('#tree-info').empty();
          });
     });
     
     // Filter Box Control
     $('#search-trees, #m-search-trees').click(function()
     {
          $('#search-box').fadeIn().jScrollPane();
          $('.jspDrag').css({backgroundColor:'#EA6D55'});

          if ( $('#info-box').is(":visible") )
          {
               $('#info-box').fadeOut();
          }
          
          if ( $('#mobile-menu').is(":visible") )
          {
               $('#mobile-menu').fadeOut();
          }                                          
          
          $('#map-controls').fadeOut();
          
          hideIntro(); 
     });     
     
     // Filter the trees
     $('.type-filter').click(function(e)
     {
          e.preventDefault();
          
          var filter = $(this).attr('href');
          
          for ( i = 0; i < trees.length; i++ )
          {
               if ( trees[i].treeType === filter ) {
                    trees[i].setVisible(true);
               }
               else {
                    trees[i].setVisible(false);
               }
          }
          
          $('#search-box').fadeOut();
     });
     
     // Genus Filter
     $('.cg-filter').click(function(e)
     {
          e.preventDefault();

          var treeType = $(this).attr('href');
          
          filterMarkers(treeType);          
     });

     function filterMarkers(tree)
     {
          if ( tree === "All" ) {
               resetCheckboxes();
               evergreen = true;
               decidious = true;
               treeTypeFilter();
          }
          else {

               for ( var i = 0; i < trees.length; i++ )
               {
                    if ( trees[i].commonGenus === tree ) {
                         trees[i].setVisible(true);
                    }
                    else {
                         trees[i].setVisible(false);
                    }
               }
          }

          $('#search-box').fadeOut();
     }
     
     // Clear active trail class on trail buttons 
     function removeActiveTrail()
     {
          $('.p-trail').each(function()
          {
               if ( $(this).hasClass("option-on") )
               {
                    $(this).removeClass("option-on");
               }
          });
     }
     
     // Swap Maps - change tile checking file to use BLUE Penguin Path Tiles
     $('#blue-trail').click(function() 
     {         
         tileChecker = 'php/blue-trailTileChecker.php';
         
         map.overlayMapTypes.removeAt(0);
         map.overlayMapTypes.insertAt(0, arboretumMapType);
         
         $(this)
         
         $('#search-box').fadeOut();
          if ( $('#map-controls').is(":hidden") )
          {
               $('#map-controls').fadeIn();     
          }
          
          removeActiveTrail();
          
          $('#blue-trail').addClass("option-on");
     });  
     
     // Swap Maps - change tile checking file to use ORANGE Penguin Path Tiles
     $('#orange-trail').click(function() 
     {         
         tileChecker = 'php/orange-trailTileChecker.php';
         
         map.overlayMapTypes.removeAt(0);
         map.overlayMapTypes.insertAt(0, arboretumMapType);
         
         $(this)
         
         $('#search-box').fadeOut();
          if ( $('#map-controls').is(":hidden") )
          {
               $('#map-controls').fadeIn();     
          }
          
          removeActiveTrail();
          
          $('#orange-trail').addClass("option-on");
     }); 
     
     // Swap Maps - change tile checking file to use BLUE Penguin Path Tiles
     $('#black-trail').click(function() 
     {         
         tileChecker = 'php/black-trailTileChecker.php';
         
         map.overlayMapTypes.removeAt(0);
         map.overlayMapTypes.insertAt(0, arboretumMapType);
         
         $(this)
         
         $('#search-box').fadeOut();
          if ( $('#map-controls').is(":hidden") )
          {
               $('#map-controls').fadeIn();     
          }
          
          removeActiveTrail();
          
          $('#black-trail').addClass("option-on");
     });    
     
     // Swap Maps - change tile checking file
     $('#no-trail').click(function() {
         
         tileChecker = 'php/tileChecker.php';
         
         map.overlayMapTypes.removeAt(0);
         map.overlayMapTypes.insertAt(0, arboretumMapType);
         
         $('#search-box').fadeOut();
         if ( $('#map-controls').is(":hidden") )
         {
               $('#map-controls').fadeIn();     
          }
          
          removeActiveTrail();
          
          $('#no-trail').addClass("option-on");
     
     });
     
     //--------------------//
     //  Find My Location  //
     //--------------------/////////////////////////////////////////////////////
     $('#find-me, #m-find-me').click(function()
     {
          getLocation();

          if ( $('#mobile-menu').is(':visible') ) {

               $('#mobile-menu').fadeOut();
               $('#map-controls').fadeIn();
          }
     });  
     
     // Get the location if this is supported
     function getLocation()
     {
		if ( navigator.geolocation ) {
               navigator.geolocation.getCurrentPosition(checkLocation, handleGeoError, {timeout:10000});
          }
          else {
               // If not supported say why
               alert("Your browser does not support this feature.");
          }
	}
     
     // Handle any errors that happen
     function handleGeoError(error) 
     {
          switch(error.code) 
         {
         case error.PERMISSION_DENIED:
           alert("You must share your location for this feature.");
           break;
         case error.POSITION_UNAVAILABLE:
           alert("Your location is unavailable.");
           break;
         case error.TIMEOUT:
           alert("Your location request timed out.");
           break;
         case error.UNKNOWN_ERROR:
           alert("An unknown error occurred, please try again.");
           break;
         }     
     }

     // Get the position if successful and move the user marker
	function checkLocation(position)
	{
		var latitude  = position.coords.latitude;
		var longitude = position.coords.longitude;
          
          var newCenter = new google.maps.LatLng(latitude, longitude);
          
          if ( dragBounds.contains(newCenter)) {
               moveUserMarker(newCenter);
               map.setCenter(newCenter);
               map.setZoom(19);
          }
          else {
               alert("You must be near Clark College with a GPS enabled device for this to work.");
          }        
     }
     
     // User marker setup
     var userMarker = new google.maps.Marker({
          largeMarker: largeUserMarker,
          mediumMarker: mediumUserMarker,
          smallMarker: smallUserMarker,
          largeShadow: largeShadow,
          mediumShadow: mediumShadow,
          smallShadow: smallShadow,
          map: map,
          position: center,
          visible: false
     });
     
     // Set marker/shadow initially to small
     userMarker.setIcon(userMarker.smallMarker);
     userMarker.setShadow(userMarker.smallShadow)
     
     // show the marker and set the new position on update
     function moveUserMarker(loc)
     {
          if ( ! userMarker.getVisible() )
          {
               userMarker.setVisible(true);     
          }
          
          userMarker.setPosition(loc);        
     }
     
     // Show the HYBRID Google map if the user selected to hide the overlay
     $('#overlay-on').click(function(e)
     {
          e.preventDefault();
          
          if ( overlay ) 
          {
               map.setOptions({styles: noStyles});
               map.overlayMapTypes.removeAt(0);
               map.setMapTypeId(google.maps.MapTypeId.HYBRID);
               overlay = false;
               
               $('#overlay-off').removeClass("option-on");
               $(this).addClass("option-on");
          }
     });
     
     // Switch back to the overlay if requested     
     $('#overlay-off').click(function(e)
     {
          e.preventDefault();
          
          if ( ! overlay ) 
          {
               map.setOptions({styles: styles});
               map.overlayMapTypes.insertAt(0, arboretumMapType);
               map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
               overlay = true;
               
               $('#overlay-on').removeClass("option-on");
               $(this).addClass("option-on");
          }
     });
     
     // Enable tree IDs (helpful for people updating marker information)
     $('#tree-ids-on').click(function(e)
     {
          e.preventDefault();
          
          debug = true;
          
          $('#tree-ids-off').removeClass("option-on");
          $(this).addClass("option-on");
     });
     
     // Turn tree IDs back off
     $('#tree-ids-off').click(function(e)
     {
          e.preventDefault();
          
          debug = false;
          
          $('#tree-ids-on').removeClass("option-on");
          $(this).addClass("option-on");
     });
 
     // Show the about popup
     $('#about-link').click(function(e)
     {
          e.preventDefault();
          $('#about-box').fadeIn();
          hideIntro(); 
     });
     
     // Show the help popup
     $('#help-link').click(function(e)
     {
          e.preventDefault();
          $('#help-box').fadeIn().jScrollPane();
          $('.jspDrag').css({backgroundColor:'#22A193'});
          hideIntro();
     });
     
     // Show the mobile about
     $('#m-menu-about').click(function(e)
     {
          e.preventDefault();
          $('#about-box').fadeIn();
          $('#mobile-menu').hide();    
     });
     
     // Show the mobile help
     $('#m-menu-help').click(function(e)
     {
          e.preventDefault();
          $('#help-box').fadeIn();
          $('#mobile-menu').hide();     
     });
     
     // Hide the intro box if its clicked anywhere (because the MAP READY might
     // appear to be a button to some people
     function hideIntro()
     {
          if ( $('#intro-box').is(":visible") )
          {
               $('#intro-box').fadeOut();    
          } 
     }
     
     // Set a session variable to stop showing the popup on refresh
     function setIntroComplete()
     {
          if ( window.sessionStorage !== "undefined" )
          {
               //localStorage and sessionStorage support is available
               sessionStorage.setItem("arboretumIntro", true);
          }
     }
     
     // Check if the user is in Private Browsing mode, if they are Safari will break
     // the script if we try to store session data
     var storageTestKey = 'sTest', storage = window.sessionStorage;
     
     try {
          storage.setItem(storageTestKey, 'test');
          storage.removeItem(storageTestKey);
     } catch (e) {
          if (e.code == DOMException.QUOTA_EXCEEDED_ERR && storage.length == 0) {
               // We cant store data so private browsing is on
               pBrowsing = true;
          } else {           
               throw e;
          }
     }
     
     $('#intro-box').click(function()
     {    
          // Only attempt to set the session data if this is not private browsing mode
          if ( ! pBrowsing ) {
               setIntroComplete();
          }
          $('#intro-box').fadeOut();
          $('#map-controls').fadeIn();
     });
     
     // Handle the closing of any pop up boxes
     $('.close-item').click(function()
     {          
          $(this).closest('.pop-up-box').fadeOut();
          
          if ( $('#map-controls').is(":hidden") )
          {
               $('#map-controls').fadeIn();     
          }    
     });
     
     // Toggle for the mobile menu. Turns off the controls and on the menu or vice versa
     $('#menu-show-hide').click(function()
     {
          if ( $('#mobile-menu').is(":visible") ) {
               $('#mobile-menu').hide();
               $('#map-controls').show();
          }
          else {
               $('#mobile-menu').show();
               $('#map-controls').hide();
          }
          
     });
     
     // Hide the mobile menu if its showing and the browser was stretched back
     $(window).resize(function()
     {
          if ( $(window).innerWidth() > 768 ) {
               $('#mobile-menu').hide();
          }
     });

});     