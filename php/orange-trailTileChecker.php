<?php

   $filename = "/var/www/arboretum/img/orange-path-tiles/" . intval($_GET['z']) . "/" .
intval($_GET['x']) . "/" . intval($_GET['y']) . ".png";

   header("Content-Type: image/png");
   header("Cache-Control: max-age=84600");

   if (file_exists($filename)) {
       header("Content-Length: " . filesize($filename));
       readfile($filename);
   } else {
       readfile("/var/www/arboretum/img/tiles/transparent.png");
   }

?>