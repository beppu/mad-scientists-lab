package Rhetoric::SignUp;
use common::sense;

use Method::Signatures::Simple;
use Try::Tiny;
use Ouch;

use Squatting;
use aliased 'Squatting::H';

our %CONFIG = (
  templates => './share/sign_up'
);

our $site = H->new({

  # @exceptions: SiteNotAvailable
  is_available => method($host) {
    ouch('SiteNotAvailable');
  },

  # @exceptions: SiteNotAvailable, InvalidUser
  make => method($host, $user) {
    ouch('SiteNotAvailable');
    ouch('InvalidUser');
  },

  # @exceptions: InvalidUser
  user => method($username) {
    ouch('InvalidUser');
  },

});

method service($class: $c, @args) {
  my $v = $c->v;
  my $doorman = $c->env->{'doorman.users.authentication'};
  if ($doorman) {
    my $username = $doorman->is_sign_in;
    if ($username) {
      $v->{user} = $site->user($username);
    }
  }
  $class->next::method($c, @args);
}

package Rhetoric::SignUp::Controllers;
use common::sense;
use Method::Signatures::Simple;
use Try::Tiny;
use Ouch;
## use MooseX::Squatting::Controller

our @C = (

  C(
    Home => [ '/' ],
    get => method {
      'Hello, World!';
    }
  ),

  C(
    Available => [ '/available/(.*)' ],
    get => method($subhost) {
      my $domain   = $self->input->{domain} // 'rhetoric.al'; 
      my $hostname = "$subhost.$domain";
      my $status   = 0;
      try {
        $status = $site->is_available($hostname);
      }
      catch {
        when (kiss('SiteNotAvailable', $_)) {
        }
        default {
        }
      };
      return qq|{"success": $status }|;
    }
  ),

  # I need users.
  # Are they shell users from the cluster?  Not this time.
  # Should I use Doorman?                   Yes.
  C(
    SignUp => [ '/sign_up' ],
    get => method {
      $self->render('sign_up');
    },
    post => method {
      my $hostname = $self->v->{hostname};
      my $user = $self->v->{user};
      try {
        $site->make($hostname, $user);
      }
      catch {
        when (kiss('SiteNotAvailable', $_)) {
        }
        when (kiss('InvalidUser', $_)) {
        }
        default {
        }
      };
      $self->redirect(R('SignUp'));
    }
  ),

  # Rhetoric::SiteManager->squat('/sites');
);

package Rhetoric::SignUp::Views;
use common::sense;
use Method::Signatures::Simple;
## use MooseX::Squatting::View

# use Squatting::View::TT;
# use Squatting::View::XML::Feed;
# my $default = $Squatting::View::TT::object->clone();
# my $atom    = $Squatting::View::XML::Feed::object->clone();
our @V = (
  # $default,
  # $atom,
);

1;

__END__

=head1 NAME

Rhetoric::SignUp - a Squatting-based web application

=head1 SYNOPSIS

Starting the app (development)

  $ squatting Rhetoric::SignUp

View the app's %CONFIG

  $ squatting Rhetoric::SignUp -s

Introspect the app using a REPL

  $ squatting Rhetoric::SignUp -C
  Rhetoric::SignUp> \%CONFIG
  Rhetoric::SignUp> \@Rhetoric::SignUp::Controllers::C
  Rhetoric::SignUp> \@Rhetoric::SignUp::Views::V

=head1 DESCRIPTION

=head1 API

=head2 Controllers

=head3 Home [ '/' ]

=head4 get

=head3 Available [ '/available/(.*)' ]

=head4 get

=head2 Views

=head3 Default

=head3 layout

=head3 home

=head1 SEE ALSO

=head1 AUTHOR

John Beppu E<lt>beppu@cpan.orgE<gt>

=head1 COPYRIGHT

=cut
