**In Progress**

# zipped-collada-loader-js
THREE js loader for loading a zipped ZAE Collada file


### Archive Packaging
[From the Collada 1.5 spec.](https://www.khronos.org/files/collada_spec_1_5.pdf)

On import and export, DCC tools must support the .zae format, which is a zip archive of one or several
.dae files (COLLADA documents) and all the referenced content (textures).

The archive must include a file named manifest.xml, an XML-encoded file that contains a <dae_root>
element. This element is a UTF8 encoding of the relative URI pointing to a .dae file. If the URI contains a
fragment then the indicated element is the starting point for application loading of the .zae archive.
Otherwise, the <scene> element will be the starting point for application loading the .zae archive. If
neither of these conditions is met then the behavior is undefined.
  
The URIs in the .zae files can reference any other file in the archive using relative paths from the root of the
archive, in accordance with the URI standard.

The archive itself may include other archives (zip, rar, kmz, zae). The URI to reference a document
inside a nested archive, itself inside the .zae archive, will use the name of the nested archive in the path.
For example:

`./internal_archive.zip/directory/document.dae#element`

It is not possible to reference content outside of an archive using a relative URI, but it is valid to reference
content using an absolute URI, such as:

`file:///other_directory/other_document.dae#element`
