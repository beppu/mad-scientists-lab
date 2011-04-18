use inc::Module::Install;

name           'Rhetoric::SignUp';
all_from       'lib/Rhetoric/SignUp.pm';
requires       'Squatting';
requires       'Method::Signatures::Simple';
install_share  'share';
                        
WriteAll;
