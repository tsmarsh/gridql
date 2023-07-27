all: user_management/config/restlettes.conf content_management/config/restlettes.conf

content_management/config/restlettes.conf: content_management/config/environment/mongos.conf
	node build_restlettes.js content_management/config/json | sed -E 's/"mongo":\ *"(.*)"/"mongo":\ $$\{\1\}/g' > content_management/config/restlettes.conf


user_management/config/restlettes.conf: user_management/config/environment/mongos.conf
	node build_restlettes.js user_management/config/json | sed -E 's/"mongo":\ *"(.*)"/"mongo":\ $$\{\1\}/g' > user_management/config/restlettes.conf

content_management/config/environment/mongos.conf:
	node build_mongos.js content_management/config/json content_management |  sed -E 's/"MONGO_URI"/$$\{\?MONGO_URI}/g' > content_management/config/environment/mongos.conf

user_management/config/environment/mongos.conf:
	node build_mongos.js user_management/config/json user_management |  sed -E 's/"MONGO_URI"/$$\{\?MONGO_URI}/g' > user_management/config/environment/mongos.conf


clean:
	rm content_management/config/restlettes.conf
	rm user_management/config/restlettes.conf
	rm content_management/config/environments/mongos.conf
	rm user_management/config/environments/mongos.conf