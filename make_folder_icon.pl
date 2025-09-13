# This script handles installing and uninstalling custom folder icons on Windows.
# It requires ImageMagick for the 'install' command's image conversion.
#
# Usage:
#   perl script.pl install "C:\My Documents" "C:\Photos\photo.jpg"
#   perl script.pl install "C:\My Documents"
#   perl script.pl uninstall "C:\My Documents"

use strict;
use warnings;
use File::Spec;
use File::Basename;
use Win32 qw();
use File::Glob qw(:bsd_glob);

# Main program logic
my $command = shift @ARGV;

if (!defined $command) {
    die "Error: No command specified. Usage: perl $0 [install|uninstall] <arguments>\n";
}

if ($command eq 'install') {
    install_icon(@ARGV);
} elsif ($command eq 'uninstall') {
    uninstall_icon(@ARGV);
} else {
    die "Error: Unknown command '$command'. Use 'install' or 'uninstall'.\n";
}

exit;

#-----------------------------------------------------------------------------
# Subroutines
#-----------------------------------------------------------------------------

sub install_icon {
    my ($folder_path, $image_path) = @_;

    # Normalize folder path
    $folder_path =~ s|\\|/|g;

    unless (-d $folder_path) {
        die "Error: Folder '$folder_path' does not exist.\n";
    }

    # If only one argument, assume the image is in the folder
    if (@_ == 1) {
        my @found_files = bsd_glob(File::Spec->catfile($folder_path, "folder.*"));
        
        # Filter for common image extensions
        my @valid_images = grep { /\.(png|jpe?g|ico)$/i } @found_files;
        
        if (@valid_images) {
            $image_path = $valid_images[0];
            print "Found image '$image_path' in the folder.\n";
        } else {
            die "Error: No 'folder.png', 'folder.jpg', or 'folder.ico' found in '$folder_path'.\n";
        }
    } elsif (@_ != 2) {
        die "Usage: perl $0 install <folder_path> [<image_path>]\n";
    }
    
    # Normalize image path
    $image_path =~ s|\\|/|g;

    unless (-e $image_path) {
        die "Error: Image file '$image_path' does not exist.\n";
    }

    my $ico_path;
    my ($filename, $dirs, $suffix) = fileparse($image_path, qr/\..*/);

    # Convert image to ICO if needed
    if (lc($suffix) ne '.ico') {
        print "Converting $suffix to .ico file using ImageMagick...\n";
        $ico_path = File::Spec->catfile($dirs, "$filename.ico");
        my $convert_command = "convert \"$image_path\" -define icon:auto-resize=256,64,48,32,16 \"$ico_path\"";
        
        my $result = system($convert_command);
        if ($result != 0) {
            die "Error: ImageMagick 'convert' failed. Make sure it's in your PATH.\n";
        }
        print "Conversion successful. New ICO file created at '$ico_path'.\n";
    } else {
        $ico_path = $image_path;
        print "Image is already an ICO file. Skipping conversion.\n";
    }

    # Use short path name
    my $short_ico_path = '';
    eval {
        $short_ico_path = Win32::GetShortPathName($ico_path);
    };
    $short_ico_path = $ico_path unless $short_ico_path;

    # Create the desktop.ini file
    my $desktop_ini_path = File::Spec->catfile($folder_path, 'desktop.ini');
    my $ini_content = "[.ShellClassInfo]\nIconResource=$short_ico_path,0\nInfoTip=Custom folder icon\n";
    open(my $fh, '>', $desktop_ini_path) or die "Could not write desktop.ini: $!";
    print $fh $ini_content;
    close($fh);

    # Set file and folder attributes
    system("attrib +h +s \"$desktop_ini_path\"");
    system("attrib +r \"$folder_path\"");

    print "Success! Custom icon installed for '$folder_path'.\n";
    print "You may need to press F5 in Explorer to refresh.\n";
}

sub uninstall_icon {
    my ($folder_path) = @_;

    if (@_ != 1) {
        die "Usage: perl $0 uninstall <folder_path>\n";
    }

    # Normalize path
    $folder_path =~ s|\\|/|g;

    unless (-d $folder_path) {
        die "Error: Folder '$folder_path' does not exist.\n";
    }

    my $desktop_ini_path = File::Spec->catfile($folder_path, 'desktop.ini');

    # Check if the desktop.ini file exists
    if (-e $desktop_ini_path) {
        print "Removing '$desktop_ini_path'...\n";
        # First, remove the system and hidden attributes so we can delete the file
        system("attrib -s -h \"$desktop_ini_path\"");
        
        # Then, delete the file
        unlink $desktop_ini_path or die "Error deleting '$desktop_ini_path': $!";
        
        print "File removed successfully.\n";
    } else {
        print "No 'desktop.ini' found in '$folder_path'. Nothing to uninstall.\n";
    }

    # Remove the read-only attribute from the folder
    print "Removing read-only attribute from '$folder_path'...\n";
    system("attrib -r \"$folder_path\"");
    print "Read-only attribute removed.\n";
    
    print "Uninstallation complete. Folder icon will revert to default.\n";
    print "You may need to press F5 in Explorer to refresh.\n";
}