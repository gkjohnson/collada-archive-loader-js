/**
 * @author Garrett Johnson / http://gkjohnson.github.io/
 * https://github.com/gkjohnson/collada-archive-loader-js
 */

THREE.ColladaArchiveLoader = function ( manager ) {

	this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;
	this._colladaLoader = new THREE.ColladaLoader();

};

THREE.ColladaArchiveLoader.prototype = {

	constructor: THREE.ColladaArchiveLoader,

	load: function ( url, onLoad, onProgress, onError ) {

		var scope = this;

		var loader = new THREE.FileLoader( this.manager );
		loader.setResponseType( 'arraybuffer' );
		loader.load( url, function ( data ) {

			onLoad( scope.parse( data ) );

		}, onProgress, onError );

	},

    parse: function (data) {
        
		function cleanPath( path ) {

			if ( /^file:/.test( path ) ) {

				console.warn( 'ColladaArchiveLoader : file:// URI not supported.' );
				return '';

			}

			path = path.replace( /\\+/g, '/' );
			path = path.replace( /^\.?\//, '' );

			var spl = path.split( '/' );
			var newpath = [];

			while ( spl.length !== 0 ) {

				var token = spl.shift();

				if ( token === '..' ) newpath.pop();
				else newpath.push( token );

			}

			return newpath.join( '/' );

        }
        //Since collada loader fails to generate 3d model with images
        //I'm replacing dae images path the archive blobs
        
        function setImagesToBlob(daefile, dir, zip) {
            //regex to locate all init_from tagss
            var initFromTagPattern = new RegExp("<init_from>(.*(\\.png|\\.jpg|\\.jpeg))</init_from>", "gm");
            //Set matched tags path to image blobs
            var matchInitFromTag;
            while ((matchInitFromTag = initFromTagPattern.exec(daefile)) !== null) {
                var imgPath = matchInitFromTag[1];
                var imgInitFromPath = decodeURI(imgPath);
                var imgFilePath = cleanPath(`${dir}/${cleanPath(imgInitFromPath)}`);
                try {
                    var fileBlob = zip.file(imgFilePath).asArrayBuffer();
                    var blob = new Blob([fileBlob], { type: 'image/png' });
                    //var bytes = new Uint8Array(fileBlob);
                    var newTag = "<init_from>" + URL.createObjectURL(blob) + "</init_from>";
                    daefile = daefile.replace(matchInitFromTag[0], newTag);
                } catch (e) {
                    //If file is not found in archive it will be loaded according to path in dae file
                    console.error('ColladaArchiveLoader : e');
                }
			}
            return daefile;
        }


		if ( window.JSZip == null ) {

			console.error( 'ColladaArchiveLoader : JSZip is required to unpack a Collada archive file.' );
			return null;

		}

		try {

			var zip = new JSZip( data );

			// Find the entry file
			var manifest = zip.file( 'manifest.xml' ).asText();
			var entryfile;

			if ( manifest == null ) {

				var files = zip.file( /\.dae$/i );

				if ( files.length === 0 ) {

					console.error( 'ColladaArchiveLoader : No manifest found and no Collada file found to load.' );

				}

				if ( files.length >= 2 ) {

					console.error( 'ColladaArchiveLoader : No manifest found and more than one Collada file found to load.' );

				}

				entryfile = files[ 0 ].name;

			} else {

				var manifestxml = manifest && ( new DOMParser() ).parseFromString( manifest, 'application/xml' );
				entryfile = [ ...manifestxml.children ]
					.filter( c => c.tagName === 'dae_root' )[ 0 ]
					.textContent
					.trim();

			}

			entryfile = cleanPath( entryfile );

			// get the dae file and directory
			var dir = entryfile.replace( /[^\/]*$/g, '' );
            var daefile = zip.file(entryfile).asText();
            //Update daefile with zipped blobs
            daefile = setImagesToBlob(daefile, dir, zip);
            var result = this._colladaLoader.parse(daefile);


           // When exporting from
            //This code is commented out as it does not work with Esko zae file
            //See that path variable for decoded string is not in use
            //for (var name in result.images) {

            //    var image = result.images[name];
            //    var path = decodeURI(image.init_from);
            //    var texpath = cleanPath(`${dir}/${cleanPath(image)}`);
            //    var data = zip.file(texpath).asArrayBuffer();
            //    var blob = new Blob([data], 'application/octet-binary');
            //    image.build.src = URL.createObjectURL(blob);
            //}
			// return the data
			return result;

		} catch ( e ) {

			console.error( 'ColladaArchiveLoader : The Collada archive file is not valid.' );
			console.error( e );

			return null;

		}

	}

};
