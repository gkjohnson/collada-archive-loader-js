THREE.ColladaArchiveLoader = function ( manager ) {

    // TODO: Use this appropriately. It's a little more complicated because
    // the final processing is async due to jszip
    // this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;
    this.manager = THREE.DefaultLoadingManager;

    this._colladaLoader = new THREE.ColladaLoader();

}

THREE.ColladaArchiveLoader.prototype = {

    constructor: THREE.ColladaArchiveLoader,

    load: function ( url, onLoad, onProgress, onError ) {

        var scope = this;

        var path = scope.path === undefined ? THREE.LoaderUtils.extractUrlBase( url ) : scope.path;

        var loader = new THREE.FileLoader( this.manager );
        loader.setResponseType( 'arraybuffer' );
        loader.load( url, function ( data ) {

            scope.parse( data, onLoad );

        }, onProgress, onError );
    },

    parse: function( data, onLoad ) {

        function cleanPath( path ) {

            if ( /^file:/.test( path ) ) {

                console.warn( 'ColladaArchiveLoader : file:// URI not supported.' );
                return '';

            }

            path = path.replace( /\\+/g, '/' );
            path = path.replace( /^\.?\//, '' );

            var updirmatches = path.match( /(\.\.\/)*/ )[ 0 ].match( /\.\./g );
            var updircount = updirmatches ? updirmatches.length : 0;
            var spl = path.split( '/' );
            while (updircount --) spl.shift();

            return spl.join( '/' );
        }

        if ( window.JSZip == null ) {

            console.error( 'ColladaArchiveLoader : JSZip is required to unpack a Collada archive file.' );
            return null;

        }

        ( async () => {

            try {

                var zip = await ((new JSZip()).loadAsync( data ));

                // Find the entry file
                var manifest = await zip.file( 'manifest.xml' ).async( 'string' );
                var entryfile;

                if ( manifest == null ) {

                    var files = zip.file(/\.dae$/);

                    if ( files.length === 0 ) {

                        console.error( 'ColladaArchiveLoader : No manifest found and no Collada file found to load.' );

                    }

                    if ( files.length >= 2 ) {

                        console.error( 'ColladaArchiveLoader : No manifest found and more than one Collada file found to load.' );

                    }

                    entryfile = files[0].name;

                } else {

                    var manifestxml = manifest && (new DOMParser()).parseFromString( manifest, 'application/xml' );
                    entryfile = [ ...manifestxml.children ]
                        .filter( c => c.tagName === 'dae_root' )[0]
                        .textContent
                        .trim();

                }

                entryfile = cleanPath( entryfile );

                // get the dae file and directory
                var dir = entryfile.replace ( /[^\/]*$/g, '' );
                var daefile = await zip.file( entryfile ).async( 'string' );

                // set the callback for fetching textures
                this._colladaLoader.loadTexture = function( image, textureLoader ) {

                    var tex = new THREE.Texture( new Image() );

                    ( async function () {
                        var texpath = cleanPath( `${ dir }/${ cleanPath(image) }` );

                        var ext = texpath.match( /[^\.]$/ )[0];
                        var data = await zip.file( texpath ).async( 'uint8array' );

                        // Decode the text data
                        var data64 = '';
                        for ( var i = 0, l = data.length; i < l; i ++ ) {

                            data64 += String.fromCharCode( data[i] );

                        }

                        data64 = btoa ( data64 );

                        // Create data url with the extension
                        tex.image.addEventListener( 'load', () => tex.needsUpdate = true, { once: true } );
                        tex.image.src = `data:image/png;base64,${ data64 }`;

                    } )()

                    return tex;

                }

                // parse the result
                var result = this._colladaLoader.parse( daefile );

                // return the data
                onLoad( result );

            } catch ( e ) {

                console.error( 'ColladaArchiveLoader : The Collada archive file is not valid.' );
                console.error( e );

            }

        } )();

    }

}